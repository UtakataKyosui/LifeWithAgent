# Knowledge Retrieval / Routing 設計

本書は#30（親Issue #26 Phase 4）に対応し、Repository Knowledge（Repowise）、Episodic Memory（Hindsight）、Architecture（Groma.md）の3つのKnowledge Sourceを、Taskの問いに応じて選択的に呼び出すためのRouting層を定義する。個別Sourceの構築（#27, #28, #29）、Freshness管理（#31）、Agent Workflowへの組み込み（#33）は対象外とし、本書ではそれらが実装済みであることを前提にインターフェースと選択ルールのみを定義する。

## 1. 前提と境界

- Routing層は各Sourceの実装詳細を知らない。呼び出すのは以下で定義する共通インターフェースのみであり、Repowise/Hindsight/Groma.mdをそれぞれ別実装（自作ストア、別ツールへの置き換え）に差し替えても、Routing層とAgent Workflow側のコードは変更不要とする。
- Routing層は特定のCoding Agent（Claude Code、Cursor等）に依存しない。各Coding Agentからは、後述のQuery関数を呼ぶ薄いAdapter（MCP tool、CLIラッパー等）経由でアクセスする。Adapterの実装はAgent Workflow側（#33）の関心事とし、本書ではAdapterが満たすべき入出力契約のみを定める。
- Source Code（現在の実装）とGit履歴が正であり、Knowledge Storeが返す情報はそれらの派生・要約に過ぎない。Routing層は「参照した」ことと「Source Codeで確認した」ことを区別できる形で結果を返す（3節のメタデータ`verification`参照）。

## 2. Knowledge Sourceごとの照会インターフェース

各SourceをRouting層から見て次の3種の抽象的な操作に正規化する。実装ツールのAPI形状はこの3操作にマッピングする。

| 操作 | 意味 | Repowise | Hindsight | Groma.md |
|---|---|---|---|---|
| `search(query)` | 自然言語の問いに対して関連情報を検索する | `get_answer` / `search_codebase`（[repowise.dev/llms-full.txt](https://repowise.dev/llms-full.txt) L51-53で確認） | `recall`（semantic/keyword/graph/temporal検索、[hindsight.vectorize.io/llms.txt](https://hindsight.vectorize.io/llms.txt)で確認） | `groma view <path>` でファイルから所属コンポーネントを解決、または`groma view --plain`で現在の構造を取得（[github.com/MrLesk/Groma.md README](https://raw.githubusercontent.com/MrLesk/Groma.md/main/README.md)で確認） |
| `lookup(id/path)` | 既知のシンボル・ファイル・エンティティを直接指定して取得する | `get_symbol` / `get_overview`（同上llms-full.txt L53） | `recall`をentity/document_id指定で呼ぶ | `groma view <path>`（同README） |
| `explain(question)` | 「なぜ」「どう変化したか」を問う分析的な問い | `get_why` / `get_risk` / `get_change_risk`（同上llms-full.txt L53, L838） | `reflect`（深い分析・意見形成、[hindsight.vectorize.io/llms.txt](https://hindsight.vectorize.io/llms.txt)「Core Operations」で確認） | 未確認。Groma.mdの公開README・llms.txt同等ファイルには`explain`相当のCLIコマンドの記載を見つけられなかった |

Repowiseの`get_dead_code` / `get_health`はRetrieval RoutingではなくWrite Policy（#32）や品質ゲート寄りの機能であり、本書のQuery対象からは除く。

### 2.1 共通レスポンス形式

Adapterは実装ツールの戻り値を、Routing層およびAgent Workflowが扱う以下の共通形式に変換する。

```json
{
  "source": "repository_knowledge | episodic_memory | architecture",
  "provider": "repowise | hindsight | groma.md",
  "content": "...",
  "meta": {
    "citation": "取得元（ファイルパス+行範囲、bank_id、groma要素ID等）",
    "generated_at": "情報が生成・indexされた時点（ISO8601）",
    "source_commit": "対象コミットのSHA（Repowise/Groma.mdのみ持つ。Hindsightは会話ベースのためnull許容）",
    "verification": "verified_by_source | unverified",
    "staleness": "fresh | stale | unknown"
  }
}
```

- `citation`と`generated_at`は出典追跡（#31 Freshnessの前提）に必須のため、Adapterがこれを埋められない場合はSourceを呼び出した結果を採用しない（4.4節）。
- `staleness`はRepowiseの`_meta`envelope（「Every response carries a _meta envelope that warns when the index has actually diverged from HEAD」、[repowise.dev/llms-full.txt](https://repowise.dev/llms-full.txt) L54）のように、実装ツールが鮮度情報を返す場合はそれをそのまま転記する。ツールが鮮度情報を返さない場合（Hindsight、Groma.mdのCLI出力は未確認）は`unknown`とし、Freshness層（#31）の判定に委ねる。
- `verification`は「Routing層がSourceから返した値をそのままAgentに渡した」場合は`unverified`、Agent側がSource CodeやGit履歴と突き合わせて確認した場合に`verified_by_source`へAgent Workflow側（#33）が更新する。Routing層自身はSource Codeを読まないため、常に`unverified`を返す。

## 3. 問いの種類から参照先を選ぶ決定論的ルール

Routing層はまず、問いを次の5分類のいずれかに機械的に振り分ける。分類はキーワード・構造（対象がファイルパスか、過去の判断を問うものか等）によるパターンマッチで行い、LLM分類は原則使わない（4節）。

| 問いの種類 | 特徴 | 参照先 | 呼び出す操作 |
|---|---|---|---|
| コード構造・依存関係 | 「このファイルは何をしているか」「どこから呼ばれているか」等、現在のコードの構造を問う | Repository Knowledge（Repowise） | `lookup` / `search` |
| 設計・アーキテクチャ | 「このシステムの構成」「このコンポーネントの責務」「C4図」等、明示化されたアーキテクチャを問う | Architecture（Groma.md） | `lookup` / `search` |
| 過去の判断・経験 | 「前回どう決めたか」「なぜこの設計にしたか（会話・作業履歴由来）」「以前のエラーの対処」等 | Episodic Memory（Hindsight） | `search` / `explain` |
| 変更のリスク・影響 | 「この変更は何を壊しうるか」「このPRのリスクは」 | Repository Knowledge（Repowise） | `explain`（`get_risk`/`get_change_risk`） |
| 該当なし・純粋な実装作業 | 新規ファイル作成、typo修正等、既存知識の再利用が不要な作業 | なし（Store検索を行わない） | — |

「該当なし」を明示的に設けるのは、親Issue #26の完了条件「無関係なStoreの一律検索や、検索結果の無条件なContext投入を避けられる」を満たすためである。問いが具体的な知識要求を含まない場合、Routing層はいずれのSourceも呼ばない。

## 4. 複数Sourceが必要な問い

### 4.1 複数Source照会が必要になる条件

次のいずれかに該当する場合、単一Sourceの分類では不十分と判断し複数Sourceを呼ぶ。

- 問いが複数分類のキーワードを同時に含む（例:「このコンポーネントの設計と、過去にここで起きた障害の経緯を教えて」→ Architecture + Episodic Memory）
- 単一Sourceの`search`結果が空、または`meta.staleness`が`stale`で使えない（4.4節のフォールバックへ進む前に、他Sourceで代替できるか試す）

### 4.2 優先順位

複数Sourceを呼んだ結果をAgentへ渡す際は、次の優先順位で並べる（数字が小さいほど優先）。

| 優先度 | Source | 理由 |
|---|---|---|
| 1 | Repository Knowledge（Repowise） | 現在のSource Codeに最も近い派生情報であり、他Sourceの記述が古い場合の裏付けに使える |
| 2 | Architecture（Groma.md） | 人が明示的にキュレーションした設計情報であり、Repowiseの自動生成情報より意図の説明力が高い |
| 3 | Episodic Memory（Hindsight） | 過去の判断・経験は参考情報であり、現在のコード・設計と矛盾する場合は1・2を優先する |

この優先順位は「実装状態はSource Code、履歴はGit、明示的な設計はArchitecture Documentを正とする」という親Issue #26の基本方針に合わせたものである。

### 4.3 LLM分類を使う条件

3節の決定論的ルールに、問いが以下のいずれかで当てはまらない場合に限り、LLM分類（問いの自然言語をSource種別へマッピングするための1回のLLM呼び出し）を使う。

- キーワードパターンに一致しない自由記述の問いで、決定論的ルールが「該当なし」と「複数Source」のどちらとも判定できない
- 分類結果によって呼び出しコストが大きく変わる（Hindsightの`reflect`は`recall`より高コストなため誤分類の影響が大きい）場合で、かつキーワードだけでは`search`と`explain`のどちらを使うべきか一意に決まらない

LLM分類を使った場合、その分類結果と根拠を`meta`とは別にRouting層のログへ残し、後から決定論的ルールへ組み込めるようにする（ルール表の継続的な拡充）。LLM分類は決定論的ルールの補完であり、常時の分類手段としては使わない。

### 4.4 参照先が使えない場合の挙動

- 対象Sourceが未設定・未起動（例: Hindsightサーバーが立っていない）の場合、Routing層はそのSourceをスキップし、他の該当Sourceの結果のみを返す。全てのSourceが使えない場合は、Storeを検索しなかったことをAgentに明示し、Source CodeやGit履歴を直接調査するよう促す。
- `search`/`lookup`/`explain`が空の結果を返した場合、他分類へのフォールバックはしない（3節の分類が誤っている可能性があるより、単に該当知識が存在しない可能性の方が高いため）。空である旨をそのままAgentへ返す。
- `meta.citation`または`meta.generated_at`を埋められない結果は採用しない（2.1節）。出典不明の情報をAgentのContextへ入れることは、親Issue #26の「知識の出典・生成時点・有効性を追跡する」方針に反する。

## 5. Storeの実装を差し替えられる境界

- Adapter層（各Coding Agentから呼ばれるMCP tool・CLIラッパー）と、2節で定義した`search`/`lookup`/`explain`の3操作、3.1節の共通レスポンス形式の3点が、Routing層と実装ツールの境界である。Repowise/Hindsight/Groma.mdのいずれかを別ツールに置き換える場合、この境界を満たすAdapterを新たに書けばRouting層・Agent Workflow側は変更不要とする。
- 逆に、3節の分類ルールと4.2節の優先順位は「Repository Knowledge / Episodic Memory / Architecture」という3つの知識区分（親Issue #26の基本方針）に対して定義しており、個々のツール名には依存しない。

## 6. 親Issue #26の4つのRetrieval Policy例について

親Issue #26本文（`gh issue view 26`で確認、2026-09-27時点）には「4つのRetrieval Policy例」の記載が無く、#30本文・コメント（`gh issue view 30 --comments`）にも記載が見つからなかった。Epic本文に例の記載が無かったため、本書の完了条件を満たす目的で以下の4例を設定した。

| 例 | 問い | 参照先（3節の分類） | 説明 |
|---|---|---|---|
| 1 | 「この関数はどこから呼ばれているか」 | Repository Knowledge | コード構造の問いのため単一Source。Groma.mdやHindsightは呼ばない |
| 2 | 「認証周りのアーキテクチャを説明して」 | Architecture | 設計の問いのため単一Source |
| 3 | 「以前このエラーをどう解決したか」 | Episodic Memory | 過去の経験の問いのため単一Source |
| 4 | 「この決済コンポーネントの設計と、過去にここで起きた不具合の経緯を教えて」 | Architecture + Episodic Memory（優先度: Architecture > Episodic Memory） | 4.1節の複数Source条件に合致する例 |

## 7. 未解決事項

- Groma.mdの`explain`相当機能（変更理由・差分の説明）は公開README・llms.txt相当ファイルの範囲では確認できなかった。#29（Repository Architecture）の構築時に、CLIの`--help`出力等で追加確認が必要。
- Hindsightの`recall`/`reflect`のレイテンシ・コスト差は[hindsight.vectorize.io/llms.txt](https://hindsight.vectorize.io/llms.txt)からは数値を確認できておらず、4.3節「呼び出しコストが大きく変わる」という記述は定性的な想定である。#28の構築時に実測して裏付けるか、本書を更新する。
- 他Source文書（#27, #28, #29, #31, #33）はこのworkspaceには存在せず、リンク先の見出し構成と本書の用語（`search`/`lookup`/`explain`、共通レスポンス形式）が一致するかは、各Issueの担当が本書とすり合わせる必要がある。

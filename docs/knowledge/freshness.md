# Knowledge Freshness管理

Repository由来のKnowledgeが現在のコードと食い違う場合に検出し、Agentが古い情報を現在の事実として使わないようにする。対象は[Repository Knowledge](./repository-knowledge.md)（#27）、[Episodic Memory](./episodic-memory.md)（#28）、[Architecture Knowledge](./architecture-knowledge.md)（#29）で、取得後の判断は[Retrieval / Routing](./retrieval-routing.md)（#30）、更新の実行は[Write Policy](./write-policy.md)（#32）が担う。本文書は「stale かどうかをどう判定するか」と「stale と判定した後どう扱うか」を定義する。

## メタデータ

Knowledge Storeに保存する各エントリは、生成元・生成時刻・対象commitを最低限持つ。フィールド名はKnowledge種別によらず共通にし、Storeの実装（Repowise / Hindsight / Groma.md）が独自形式を持つ場合はこの4項目に正規化して保持する。

| フィールド | 内容 | 例 |
|---|---|---|
| `source` | 生成元。どのツール・手順が作ったか | `repowise-index`, `hindsight-session`, `groma-scan`, `human` |
| `generated_at` | 生成時刻（ISO 8601、UTC） | `2026-09-27T13:42:07Z` |
| `indexed_commit` | 生成時点でのGit HEADのフルSHA | `4d93ab1c07cf7e70ac650f2eb73319c543c106de` |
| `subject_paths` | Knowledgeが根拠にしたファイルパス（複数可） | `["src/scanner/typescript.ts"]` |

`indexed_commit`はこのリポジトリで`git rev-parse HEAD`が返す値をそのまま使う（動作確認済み、下記コマンド参照）。`subject_paths`が広すぎる（リポジトリ全体など）場合は、stale判定の精度が落ちるため、生成時に対象を絞れるKnowledge種別（Architecture、Repository）では必須とする。Episodic Memoryは判断の経緯そのものが対象であり、特定ファイルに絞れない場合は`subject_paths`を空配列にしてよい。

## Stale判定

現在のGit HEADと`indexed_commit`の関係を、次のコマンドで判定する。このリポジトリ（jj colocated、git write系コマンドは使わない）で実行して動作を確認した。

```bash
# indexed_commit が現在の HEAD の祖先かどうか（祖先なら exit 0）
git merge-base --is-ancestor <indexed_commit> HEAD

# indexed_commit から HEAD までに変更されたファイル一覧
git diff --name-only <indexed_commit> HEAD
```

実行例（このリポジトリの`91fdebd`を`indexed_commit`とみなした場合）:

```
$ git merge-base --is-ancestor 91fdebd HEAD; echo $?
0
$ git diff --name-only 91fdebd HEAD
.github/workflows/ci.yml
.github/workflows/fallow.yml
```

判定は次の順で行う。

1. `git merge-base --is-ancestor <indexed_commit> HEAD` が非0を返す場合（`indexed_commit`がHEADの祖先でない、または存在しない）、そのKnowledgeは**invalid**として扱う。rebase・force-push・historyの書き換えで参照先が失われた状態であり、再Indexが必要。
2. 祖先である場合、`git diff --name-only <indexed_commit> HEAD`の出力と`subject_paths`を比較する。
   - 交差がない → **fresh**。そのまま利用する。
   - 交差がある → **stale**。下記の扱いに従う。
3. `subject_paths`が空（Episodic Memoryなど）の場合は、diffの有無ではなく生成からの経過時間とコミット数で判定する（下記Lifecycle参照）。

## Stale時の扱い

| 種別 | 条件 | 扱い |
|---|---|---|
| 再Index | `subject_paths`に対応する変更が小規模（数ファイル）で、Storeが差分更新をサポートする（Repowiseの再Index等） | 該当ファイルのみ再Indexし、`generated_at`と`indexed_commit`を更新する |
| stale表示 | 再Indexが即時に行えない、またはEpisodic Memoryのように再生成できない性質のKnowledge | 取得結果に`stale: true`と`indexed_commit`をAgentへの応答に含め、そのままでは事実として使わせない |
| Source Code再確認 | Agentがそのstale Knowledgeを根拠に実装判断・回答をしようとしている | Knowledgeを参照する前に対象ファイルを`Read`し、現在のコードと食い違っていないか確認してから使う。食い違いがあればKnowledgeを無視しコードを正とする |

Retrieval側（#30）は、stale判定済みのKnowledgeを返す際に必ず`stale`フラグを含める。Agentはこのフラグを見て上記のどちらの経路を取るかを決める。フラグを無視して古い情報を事実として提示することを防ぐのはPrompt/Workflow側の責務（#33）であり、本文書はフラグの生成条件のみを定義する。

## 有効性確認方法

### Architecture Knowledge（Groma.md想定）

Groma.mdは`groma web`での再スキャンにより、直前のAgentによる編集（コンポーネント名・関連付けなど）を保持したまま構造を更新する。また過去のリビジョンをコミット単位で開き、その時点のソースと突き合わせて確認する機能を持つ（`groma export --revision <commit>`）。これはGitHub上の公式READMEで確認した（https://github.com/MrLesk/Groma.md 、2026-09-27取得）。

有効性確認は次の手順を取る。

1. Architecture Documentが参照するコンポーネントの`subject_paths`に対して、上記のStale判定コマンドを実行する。
2. staleと判定されたコンポーネントは、`groma`の再スキャンで構造差分を検出できるため、再スキャンを促す。再スキャン自体の実行はWrite Policy（#32）の管轄とし、本文書は「staleなら再スキャンが必要」という判定条件のみを定義する。
3. Groma.mdが公式に「鮮度メタデータ（生成時刻・stale flag）」をエントリ単位で持つかどうかは、READMEおよびトップページ（https://groma.md/）から確認できなかった。持つと明示できないため、`generated_at`・`indexed_commit`の付与はこのリポジトリ側のラッパー（Knowledge Store層）で行う前提とする。

### Historical Knowledge（Hindsight想定）

Hindsightの公式ドキュメント（https://hindsight.vectorize.io/docs/developer/ 、2026-09-27取得）を確認したが、stale・freshness・expire・timestampといった鮮度管理に関する記述は該当ページのHTMLから見つからなかった（JavaScriptによる動的レンダリングのため取得できていないページがある可能性があり、鮮度メタデータの有無は**未確認**とする）。

このためEpisodic Memoryの有効性は、Hindsight側の機能に依存せず、このリポジトリのメタデータ（`generated_at`・`indexed_commit`）で管理する。

1. 判断・経験の記録は`subject_paths`を持たないことが多いため、`indexed_commit`からのコミット数、または`generated_at`からの経過期間のいずれかが閾値を超えたら**要確認**とする。閾値の具体値はEpisodic Memory設計（#28）側で定める。
2. 要確認になったEpisodic Memoryは、記録した判断の前提（例: 当時参照した設計・API）が現在も成立するかをAgentがSource CodeまたはArchitecture Documentで確認してから使う。前提が崩れていれば、そのEpisodic Memoryは無効化する（Lifecycle参照）。

### Repository Knowledge（Repowise想定）

Repowiseの公式サイト（https://repowise.dev/ ）はJavaScriptで描画されるSPAで、curlによる静的取得ではドキュメント本文を確認できなかった。鮮度メタデータをRepowise自身が持つかどうかは**未確認**とする。Repository Knowledgeの鮮度管理は、Groma.mdと同様にこのリポジトリ側のメタデータ付与に依存する前提を置く。

## 更新失敗時・根拠不明時の扱い

| 状況 | 扱い |
|---|---|
| 再Indexが失敗した（ツールエラー、対象ファイル削除済みなど） | Knowledgeエントリを**invalid**にし、`stale: true`に加えて`invalid_reason`を記録する。取得結果には出さず、Agentには「このKnowledgeは利用不可」として提示する |
| `indexed_commit`が記録されていない、または不正な値である | 生成時のメタデータ付与漏れとして扱い、そのエントリは常にstale扱いにする（fresh判定の根拠がないため） |
| Storeの鮮度管理機能の有無が未確認（Repowise・Hindsight） | このリポジトリ側で共通メタデータを付与する前提を崩さない。Store側の機能を鮮度判定の根拠に使わない |

## Lifecycle

```
生成（generated_at, indexed_commit を記録）
  ↓
fresh（subject_pathsに変更なし、または indexed_commit が HEAD）
  ↓ HEAD が進み、対象ファイルに差分発生
stale（stale: true を付与）
  ↓
  ├─ 再Index可能 → 再Index実行 → generated_at / indexed_commit を更新 → fresh に戻る
  ├─ 再Index不可（Episodic Memory等） → Source Code / Architecture Documentで前提を再確認
  │     ├─ 前提が成立 → generated_at のみ更新して有効なまま残す（indexed_commitは更新しない。前提確認をした事実と、元の生成時点を分けて残すため）
  │     └─ 前提が崩れている → invalid にし、Write Policy（#32）の削除・アーカイブ手順に渡す
  └─ indexed_commit が HEAD の祖先でない（historyの書き換え） → invalid → 再Index必須
```

invalidになったエントリの削除・アーカイブの実行手順自体はWrite Policy（#32）が定義する。本文書が定義するのは、いつinvalidと判定するかの条件のみである。

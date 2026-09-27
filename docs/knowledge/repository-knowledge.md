# Repository Knowledge 基盤（#27）

Agentがコード構造・Symbol・依存関係・Git履歴を、毎回の全体探索なしに取得できるようにするための基盤。親Issue #26 の方針に従い、Repository Knowledgeの担当ツールとしてRepowise（https://repowise.dev/）を検証した。

Repository全体を無条件にPromptへ投入すること、Knowledge StoreをSource of Truthにすることは対象外とする（#26方針）。

## 1. 検証対象ツール

| 項目 | 内容 |
|---|---|
| ツール名 | Repowise |
| ライセンス | AGPL-3.0（コア）。有償のHosted/Enterprise tierあり |
| 配布形態 | PyPI（`pip install repowise`）、npmにも公開あり |
| 動作方式 | ローカルでリポジトリを解析しインデックスを作成する。`--no-prose`時は解析にLLM呼び出しを使わない |
| Agent連携 | MCPサーバー（`repowise mcp`）として10種のツールを公開する。CLIからも同じ情報を取得できる |

出典: https://repowise.dev/ （2026-09-27取得）、https://raw.githubusercontent.com/repowise-dev/repowise/main/README.md （2026-09-27取得）、同リポジトリの`docs/start/QUICKSTART.md`（2026-09-27取得）。

## 2. 導入方法（このRepositoryで実施した手順）

sudoやユーザー環境を汚す変更をせずに検証するため、`uvx`（プロジェクト外のisolatedなキャッシュに一時インストールする方式）を使った。`pip install repowise`が本来の推奨手順だが、この検証機の`python3`が3.9系でRepowiseの要求（Python 3.11+）を満たさないため`uvx`を選んだ。

```bash
uvx repowise --version
# repowise, version 0.53.0

cd <repo>
REPOWISE_SKIP_EDITOR_SETUP=1 uvx repowise init \
  --yes --no-prose --no-editor-setup --no-hook --no-claude-md --no-agents
```

`--no-prose`はLLM Providerのキー無しで、コード構造から生成できる範囲のwikiだけを作るオプションで、APIキーは使っていない。`--no-editor-setup`と`REPOWISE_SKIP_EDITOR_SETUP=1`は、`.mcp.json`や`~/.claude/settings.json`、git hookなどworker機の外や許可ファイル外への書き込みを止めるためのもので、実施後に`repowise doctor`で「Claude Code MCP entry: not registered」「Post-commit hook: not installed」を確認した。

生成物はすべて`.repowise/`配下に作られる（`wiki.db`、`lancedb/`、`knowledge-graph.json`、各種`*_cache.pkl`、`.repowise/mcp.json`など）。`.repowise/mcp.json`はworker機の絶対パスを含み、リポジトリへコミットする設定ファイルとしては不適切と判断したため、`.gitignore`に`.repowise/`を追加してコミット対象から外した。

このリポジトリでの実行結果は、14ファイル・0 symbol・Graph 28 nodes/14 edges（`.github/`、`docs/overview.md`、`biome.json`など、yaml 79% / json 14% / markdown 7%）だった。現時点でこのリポジトリにアプリケーションのソースコードが存在しないため、Symbol抽出・依存グラフ・hotspotの検証は構造的な動作確認のみにとどまり、実コードに対する精度は未検証である。

## 3. 取得できた情報（実際に実行して確認）

| 照会 | コマンド | 結果 | 根拠に使えるか |
|---|---|---|---|
| Overview | `repowise status` | Pages by Type（onboarding 1, repo_overview 1）、Last sync commit（`4d93ab1c07cf...`）を返す | 元commitハッシュが付き根拠になる |
| 依存関係・ファイル単位の要約 | `repowise context docs/overview.md` | 対象ファイルのタイプ・レイヤー・行数・見出し一覧・「no indexed symbols」の明記を返す | ファイルパスと行数が根拠になる。Symbol無しの場合はその旨を明記する設計で、無いものを作らない |
| 変更影響（Change risk） | `repowise risk HEAD~3..HEAD` | 対象コミット（`Merge pull request #24...`）のdiff規模・分散度・関与ファイル数・author経験値をスコア化し、"90th percentile"等のベンチマーク付きで返す | commit識別子と差分行数が根拠になる。bug-fix履歴が無い旨も明記される |
| Decision / Why | `repowise why docs/overview.md` | 「No architectural decisions govern this file」を明示する。architecture decisionが無ければ空扱いにする | 「無い」と言い切る設計で、無い理由を推測で作らない |
| 検索 | `repowise search "overview"` | インデックス済みSymbol無しのため "No results found" | 失敗時に代替手段（Grep、`mode=symbol`）を案内する |
| 自然文質問（ask） | `repowise ask "このリポジトリの目的は何か"` | APIキー未設定でも動作し、ヒットが無ければ "No wiki hits" と信頼度lowを明示して返す | 回答が空でも失敗せず、次の代替手段を案内する。幻覚回答をしない |
| Dead code / Code health | `repowise dead-code`, `repowise health` | 0 findings、10.0/10（対象コードが存在しないため） | 現行リポジトリでは検証できない。コード追加後に再検証が必要 |
| Doctor（自己診断） | `repowise doctor` | 全チェックPASS。MCP登録・post-commit hookが未設置であることを確認 | スコープ外への書き込みが無いことの確認に使えた |

Hotspot（Gitホットスポット）は未検証である。`repowise risk`・`repowise dead-code`の出力中に`hotspots=0`と出ているのみで、bug-fix履歴を伴う専用照会（bug-magnet表示など）はコミット数・履歴が乏しいこのリポジトリでは意味のある結果を確認できなかった。実コードとバグ修正履歴が積まれた状態での再検証が必要である。

MCPサーバーの起動自体も未検証である。`repowise mcp --help`でstdio/streamable-http/SSEの3種のtransportと、READMEに記載の`get_answer`/`get_architecture`/`get_why`/`get_risk`/`get_health`/`get_context`/`get_security`を含む10個のデフォルトツールが存在することを確認したが、実際に`repowise mcp`を起動してMCPクライアント（Claude Code等）から呼び出す検証は、このworkspaceでは実施していない（このマシンに`timeout`コマンドが無く、フォアグラウンドで安全に停止する手段を確保できなかったため中断した）。CLI（`repowise ask` / `repowise context` / `repowise risk` / `repowise why`）はMCPツールと同じインデックスを参照するため、CLIでの検証結果はMCP経由の応答内容の目安にはなるが、MCP経由の応答形式そのものは確認していない。

LLM Provider連携（`--prose`、`repowise ask`の高精度回答）も未検証である。APIキーが必要な段階であり、有料アカウント・外部送信を伴うため、Issue #27の「未検証」条件に従い着手していない。`--no-prose`のkeyless動作のみを検証範囲とした。

## 4. 最終的な事実はSource Code / Gitで確認する手順

Repowiseの出力はいずれも派生情報であり、Source of Truthではない（#26方針）。Agentが取得した内容を使う際は次の手順で裏を取る。

- ファイル内容について、`repowise context <path>`が返す行数・見出しは概要にとどまるため、実際の記述は`Read <path>`で確認する
- 依存関係・呼び出し元について、Symbolが抽出されているリポジトリでは`get_context`/`get_architecture`相当の出力にファイル・行番号が付く。最終確認は対象ファイルをGrep/Readし、実際のimport文・呼び出し箇所を読む
- 変更影響（risk）について、`repowise risk <range>`が示す関与ファイル・commitは、`git log`/`git show <commit>`または`jj log`/`jj diff`で実際の差分を確認する
- Decision（why）について、「decisionが無い」という応答は、そのファイルにADRやコメントアーカイブが存在しないことを意味するに過ぎない。設計判断の根拠を示す必要がある場合は、Issue/PR/コミットメッセージを`gh`や`git log`で直接確認する
- Freshnessについて、`repowise status`の`Last sync commit`が現在のHEADより古い場合、インデックスは古い。再インデックスは`repowise update`（差分更新）または`repowise init --force`（全再生成）で行う。freshnessの判定ルールは#31（`docs/knowledge/freshness.md`）に委ねる

MCPツールの応答にも鮮度情報が付く。主エージェントの確認によると、https://repowise.dev/llms-full.txt （614行目付近）には、MCPレスポンスごとに`_meta`エンベロープが付き、`index_age_days`・`indexed_commit`・`stale_warning`を含むとの記載がある。この記載はこのワーカーのセッションでは未取得のため、`repowise status`の`Last sync commit`と同種の情報がMCP応答にも構造化された形で含まれるという点までは確からしいが、フィールド名・具体的な値の形式はこのセッションで直接確認していない。

## 5. ツールの不足・置換が必要な点

| 項目 | 内容 |
|---|---|
| Python要件 | Repowiseは Python 3.11+ を要求する。この検証機の`python3`は3.9系だったため`pip install`は使わず`uvx`で回避した。CI/他機で`pip install repowise`を使う場合は事前にPythonバージョンを確認する必要がある |
| npx不在 | このマシンには`npx`が無く（`node`のみ）、`pnpm`/`bunx`/`uvx`のいずれかで代替する必要があった。npmでの配布も公式にアナウンスされているため、npx経由の導入手順は別環境で要検証 |
| Symbol/依存グラフの実効性 | 本リポジトリにソースコードが無いため未検証。#33（Agent Workflowへの統合）着手前に、実コードを含むリポジトリ（またはRepowise公式が示すdjango/reactのベンチマークリポジトリ）で精度を再確認する必要がある |
| MCP経由の実利用 | CLI検証のみで、MCPサーバーの起動・Claude Code等からの実呼び出しは未実施。#33で実際にAgentから呼び出す形で再検証する必要がある |
| コミット対象 | `.repowise/mcp.json`は絶対パスを含み機体依存のため、リポジトリにコミットする設定として使えない。チームで共有する場合は`.mcp.json`（リポジトリルート、`repowise init`が生成し、相対的な`command: repowise`のみを持つファイル）を別途生成・レビューして採用可否を判断する必要がある。本Issueでは`--no-editor-setup`によりこのファイル自体を生成していない |
| 有償要素 | Hosted版の月10回の質問枠やPRボット、Enterprise向け機能は本検証の対象外で未検証。ローカルの`--no-prose`運用のみが検証範囲 |

## 6. 関連文書

- 取得した情報のRouting/優先順位: `docs/knowledge/retrieval-routing.md`（#30, 未作成）
- インデックスの鮮度判定: `docs/knowledge/freshness.md`（#31, 未作成）
- Episodic Memory: #28
- Repository Architecture（Groma.md想定）: #29

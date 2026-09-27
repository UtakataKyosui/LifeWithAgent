# Agent Workflow への Knowledge Retrieval 統合

親Issue: [#26](https://github.com/UtakataKyosui/LifeWithAgent/issues/26)（[Setup] AI Agent向け知識管理基盤を構築する）
対象Issue: [#33](https://github.com/UtakataKyosui/LifeWithAgent/issues/33)

このドキュメントは、Coding Agentが本Repositoryで作業する際に、Knowledge Store（Repository Knowledge / Episodic Memory / Architecture）をいつ照会し、いつ更新するかを定義する。Claude Code、Codexなど特定のAgentの機能名には依存しない。どのAgentも「Task Analysis」「照会」「実装」「更新」という区切りでWorkflowを組めることを前提にする。

## 前提 Knowledge Storeは派生情報である

Epic #26の基本方針を踏襲する。

| 情報の種類 | 正となる場所 | Knowledge Storeの位置づけ |
|---|---|---|
| 現在の実装状態 | Source Code | 探索を助ける派生情報（索引） |
| 変更履歴・経緯 | Git（コミット・PR） | 索引 |
| 明示的な設計判断 | Architecture Document | 索引 |

Knowledge Storeの回答は「どこを読むべきか」を示す手がかりであり、それ自体を実装判断の根拠にしない。この原則は本Workflowの全ステップで維持する。

## Workflow全体

```
1. Task Analysis
2. Knowledge Requirement 判断
   └─ 不要と判断 → 3をスキップし4へ
3. 照会（Retrieval / Routing）
4. 関連 Context の選別
5. Planning / Implementation / Validation（Source Code最終確認）
6. Knowledge Extraction / Update 判断
   └─ 保存価値なし → 更新を省略して終了
   └─ 保存価値あり → Write Policyに従って更新
```

### 1. Task Analysis

着手前に、Taskを次の観点で分解する。

| 観点 | 確認内容 |
|---|---|
| 対象範囲 | 変更するファイル・機能はどこか |
| 既知度 | 直前のセッションや会話で既に把握済みか |
| 種別 | バグ修正、機能追加、設計変更、調査のどれか |

### 2. Knowledge Requirement 判断

以下のいずれかに該当する場合のみ、Knowledge Storeへの照会に進む。該当しない場合は照会を省略し、直接Source CodeとGitを読む。

- 対象範囲が広く、関係するファイルや呼び出し元を先に把握したい
- 過去に類似の判断・失敗があった可能性があり、繰り返しを避けたい
- 明示的な設計判断（Architecture Document）が既にあるはずの領域である

1行の修正やタイプミス修正のように、対象が1ファイルに閉じていて経緯確認が不要なTaskは、照会自体をスキップしてよい。

### 3. 照会（Retrieval / Routing）

どのSourceに、どの順で照会するかのRouting方針は [retrieval-routing.md](./retrieval-routing.md)（#30）に従う。本Workflowでは「Task Analysisの結果を渡して照会する」という接続点だけを定義する。

候補Source（採否は各担当Issueで検証中）。

| 領域 | Source | 参照ドキュメント |
|---|---|---|
| Repository Knowledge（コード構造） | Repowise | [repository-knowledge.md](./repository-knowledge.md)（#27） |
| Episodic Memory（過去の経験・判断） | Hindsight | [episodic-memory.md](./episodic-memory.md)（#28） |
| Architecture（明示的な設計） | Groma.md | [architecture-knowledge.md](./architecture-knowledge.md)（#29） |

Freshness（古い知識の検出・再確認）は [freshness.md](./freshness.md)（#31）に従う。

### 4. 関連 Context の選別

照会結果には対象外の情報が含まれ得る。Contextへ渡す前に次を確認する。

- 対象範囲（Task Analysisで定めた範囲）に直接関係する項目だけを残す
- Freshness上「Stale」と判定された項目は、そのままでは使わず、後続のSource Code確認で裏を取る対象として扱う
- 「呼び出し元が0件」のような結果は、探索範囲がどこまで解決されたかの注記を確認してから採用する

### 5. Planning / Implementation / Validation でのSource Code最終確認

Knowledge Storeの回答をそのまま実装判断に使わない。次のタイミングで、実際に変更する・依存するファイルをRead/Grepで確認する。

| フェーズ | 確認すること |
|---|---|
| Planning | 変更対象ファイルの現在の内容、呼び出し元・呼び出し先 |
| Implementation | 変更中のファイルの実際のコード（照会結果の要約ではなく実体） |
| Validation | テスト・Lintの実行結果。Knowledge Storeの記述と実装が一致しているか |

Knowledge Storeの結果のみを根拠にコードを変更しない。差異があれば実際のSource Codeを正とする。

### 6. Knowledge Extraction / Update

作業後、保存する価値のある知識が生まれたかを判断する。判断基準と書き込み手順は [write-policy.md](./write-policy.md)（#32）に従う。本Workflowでは判断の入口だけを定義する。

保存すべき知識がないTaskでは、更新を省略してよい。「省略してよい」に該当する例。

- 既存の記述と一致する内容しか分からなかった
- Taskの範囲が狭く、他のTaskへ再利用できる知識が生まれなかった
- 一時的な試行錯誤のログであり、結論だけでは再利用価値がない

保存する場合は、次を区別してWrite Policyの担当先へ渡す。

| 生まれた知識の種類 | 担当 |
|---|---|
| コード構造の変化（新規ファイル、依存関係の変化） | Repository Knowledge |
| 判断の経緯・失敗と回避（Episodic） | Episodic Memory |
| 明示的な設計判断の変更 | Architecture Document |

## ウォークスルー

### 例1: 習慣の重複記録防止ロジックの修正（バグ修正・小規模）

対象は、`logHabit` Toolで同日の二重記録が防止されないバグの修正である。

| ステップ | 実施内容 |
|---|---|
| Task Analysis | 対象は `habits` 関連のTool 1ファイル。範囲は狭い |
| Knowledge Requirement判断 | 対象が1ファイルに閉じており、経緯確認も不要と判断。照会を省略 |
| 照会 | スキップ |
| Context選別 | スキップ |
| Planning/Implementation | 対象ファイルをRead。`habit_logs`テーブルの`UNIQUE(habit_id, logged_date)`制約とTool側の実装を直接確認して原因を特定 |
| Validation | 修正後にテストを実行し、同日2回目の記録がエラーまたは無視になることを確認 |
| Extraction/Update | 既存のデータモデル定義（`docs/overview.md`）と一致する内容のみだったため、更新を省略 |

### 例2: MCPクライアント基盤の追加実装（新規機能・広範囲）

対象は、SSE型・npx型のMCPサーバーに接続するクライアント層の新規実装である。

| ステップ | 実施内容 |
|---|---|
| Task Analysis | 新規モジュール。既存の`src/mastra/`構成、環境別の切り替え方針（本番はnpx型不可）に依存する |
| Knowledge Requirement判断 | 環境ごとの制約という明示的な設計判断が既にあるはずの領域のため、照会が必要と判断 |
| 照会 | Architecture（設計判断: 環境別のMCP対応方針）とRepository Knowledge（既存の`src/mastra/`構成、依存関係）に照会 |
| Context選別 | 対象範囲であるMCPクライアント層に関する項目だけを残す。無関係な過去のUI変更の記録は除外 |
| Planning | 照会結果を手がかりに、実際に`src/mastra/`配下の既存ファイルをReadし、モデル定義の切り替え方式（`models.ts`）を確認したうえで設計する |
| Implementation | 実装中も変更対象ファイルの実体を都度確認する |
| Validation | ローカル環境（`mastra dev`）でSSE型・npx型それぞれの接続と、MCP未設定時に正常動作することを確認する |
| Extraction/Update | 「本番ではnpx型を使わない」という制約の運用上の注意点が実装を通じて明確になった場合、Architecture Documentへの追記候補としてWrite Policyの判断に回す。単なる実装完了報告は保存しない |

## この文書の対象外

- Retrieval / Routingの具体的な照会順序・優先度: [retrieval-routing.md](./retrieval-routing.md)（#30）
- 書き込み判断の詳細基準（重複排除・保存期間など）: [write-policy.md](./write-policy.md)（#32）
- 各Sourceの導入・運用方法: [repository-knowledge.md](./repository-knowledge.md)（#27）、[episodic-memory.md](./episodic-memory.md)（#28）、[architecture-knowledge.md](./architecture-knowledge.md)（#29）
- 古い知識の検出方法: [freshness.md](./freshness.md)（#31）
- 導入前後の効果測定方法: [measurement.md](./measurement.md)（#34）

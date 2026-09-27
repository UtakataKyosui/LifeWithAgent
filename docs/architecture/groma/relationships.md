---
type: Groma Relationships
title: Architecture relationships
---

推測（`docs/overview.md`の処理フロー4.2節に基づく計画、未実装）。Groma.mdの`relationships.md`規約はComponent間の関係をSource CodeファイルパスへリンクするCode-to-Code宣言を求めるが、Source Codeが存在しないため、ここではC4 Concept間のリンクで代替する。Source Codeが実装された段階で、対応するファイルパスへのリンクに置き換える。

## Draft relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [ユーザー](actors/user.md) | [フロントエンド](systems/life-app/containers/frontend/container.md) | テキストまたは音声で入力する | ブラウザ |
| [フロントエンド](systems/life-app/containers/frontend/container.md) | [STTエンドポイント](systems/life-app/containers/backend/components/voice-endpoint.md) | 録音した音声ファイルを送信する | HTTPS |
| [STTエンドポイント](systems/life-app/containers/backend/components/voice-endpoint.md) | [Cloudflare Workers AI](externals/workers-ai.md) | Whisperで文字起こしする | Workers AI Binding |
| [フロントエンド](systems/life-app/containers/frontend/container.md) | [生活管理アシスタントAgent](systems/life-app/containers/backend/components/life-assistant-agent.md) | 発話・入力内容を送信し応答を受け取る | HTTPS |
| [生活管理アシスタントAgent](systems/life-app/containers/backend/components/life-assistant-agent.md) | [Cloudflare Workers AI](externals/workers-ai.md) | 意図解釈と応答生成を行う | Workers AI Binding |
| [生活管理アシスタントAgent](systems/life-app/containers/backend/components/life-assistant-agent.md) | [タスク管理Tools](systems/life-app/containers/backend/components/task-tools.md) | タスク操作のToolを呼び出す | Mastra Tool呼び出し |
| [生活管理アシスタントAgent](systems/life-app/containers/backend/components/life-assistant-agent.md) | [習慣管理Tools](systems/life-app/containers/backend/components/habit-tools.md) | 習慣操作のToolを呼び出す | Mastra Tool呼び出し |
| [生活管理アシスタントAgent](systems/life-app/containers/backend/components/life-assistant-agent.md) | [MCPクライアント](systems/life-app/containers/backend/components/mcp-client.md) | 外部サービス連携Toolを呼び出す | Mastra Tool呼び出し |
| [タスク管理Tools](systems/life-app/containers/backend/components/task-tools.md) | [Cloudflare D1](externals/cloudflare-d1.md) | tasksテーブルを読み書きする | SQL |
| [習慣管理Tools](systems/life-app/containers/backend/components/habit-tools.md) | [Cloudflare D1](externals/cloudflare-d1.md) | habits / habit_logsテーブルを読み書きする | SQL |

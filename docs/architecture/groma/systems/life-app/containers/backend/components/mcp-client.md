---
type: C4 Component
title: MCPクライアント
description: 外部サービスのMCPサーバーへ接続しToolとして提供する
status: draft
groma:
  id: mcp-client
  parent: backend
  technology: '@mastra/mcp'
---

推測（`docs/overview.md` 5.6節・4.3節`src/mastra/mcp/client.ts`に基づく計画、未実装）。SSE型（本番・ローカル両対応）とnpx型（ローカルのみ）のMCPサーバーに接続し、実行環境に応じて利用可能なサーバーだけを読み込む。書き込み系操作の実行前にユーザー確認を挟む。

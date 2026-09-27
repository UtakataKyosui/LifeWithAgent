---
type: C4 Container
title: バックエンド
description: Mastra AgentとSTTエンドポイントを提供するCloudflare Workers上のAPI
status: draft
groma:
  id: backend
  parent: life-app
  technology: Mastra, Cloudflare Workers, TypeScript
---

推測（`docs/overview.md` 4.1〜4.3節に基づく計画、未実装）。`POST /api/voice/transcribe`でのSTT処理と、`POST /api/agents/.../generate`でのAgent呼び出しを提供する。frontendコンテナと同一デプロイである。

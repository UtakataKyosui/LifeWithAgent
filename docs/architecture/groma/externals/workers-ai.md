---
type: C4 System
title: Cloudflare Workers AI
description: LLM推論とWhisperによる文字起こしを提供するCloudflareのマネージドサービス
status: draft
groma:
  id: workers-ai
  technology: '@cf/meta/llama-3.3-70b-instruct-fp8-fast, @cf/openai/whisper-large-v3-turbo'
---

推測（`docs/overview.md` 3.1節・3.2節に基づく計画、未実装）。life-appが直接コードを保有しない外部システムとして扱う。Agentの応答生成とSTTの推論を担う。

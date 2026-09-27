---
type: C4 Component
title: STTエンドポイント
description: 音声ファイルをWorkers AI Whisperで文字起こしするAPI Route
status: draft
groma:
  id: voice-endpoint
  parent: backend
  technology: Cloudflare Workers, Workers AI Whisper
---

推測（`docs/overview.md` 4.2節・4.3節`src/routes/voice.ts`に基づく計画、未実装）。`POST /api/voice/transcribe`で音声ファイルを受け取り、Workers AI Whisper（`@cf/openai/whisper-large-v3-turbo`）で文字起こしした結果を返す。

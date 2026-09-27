---
type: C4 System
title: 生活管理アプリケーション
description: タスクと習慣をテキストまたは音声で記録・確認できるAIアシスタント
status: draft
groma:
  id: life-app
  technology: Mastra, Cloudflare Workers, Cloudflare D1, Cloudflare Workers AI
---

推測（`docs/overview.md`に基づく計画。2026-09-27時点でSource Codeは存在せず未実装）。ユーザーがテキストまたは音声で発話した内容をAI Agentが解釈し、タスクの追加・完了、習慣の記録・確認、週次サマリーの取得を行う。フロントエンドとバックエンドをCloudflareへ1デプロイに統合する方針である。

## Requirements

- 音声入力・テキスト入力のどちらでも同一のAgent・Tools・Memoryを使う
- 外部サービスへの書き込みはユーザーの確認を必須とする
- Workers AIの無料枠内での運用を目標とする

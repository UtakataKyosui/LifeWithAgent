---
type: C4 Component
title: タスク管理Tools
description: タスクの追加・一覧・完了を行うAgent Tool群
status: draft
groma:
  id: task-tools
  parent: backend
  technology: Mastra Tools, Cloudflare D1
---

推測（`docs/overview.md` 5.1節・8.2節`src/mastra/tools/tasks.ts`に基づく計画、未実装）。`addTask` / `listTasks` / `completeTask`を提供し、D1の`tasks`テーブルを読み書きする。

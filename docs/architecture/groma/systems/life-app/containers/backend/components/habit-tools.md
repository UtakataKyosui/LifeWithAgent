---
type: C4 Component
title: 習慣管理Tools
description: 習慣の登録・達成記録・サマリー取得を行うAgent Tool群
status: draft
groma:
  id: habit-tools
  parent: backend
  technology: Mastra Tools, Cloudflare D1
---

推測（`docs/overview.md` 5.2節・5.3節・8.2節`src/mastra/tools/habits.ts`に基づく計画、未実装）。`addHabit` / `logHabit` / `getHabitStatus` / `getWeeklySummary`を提供し、D1の`habits`・`habit_logs`テーブルを読み書きする。

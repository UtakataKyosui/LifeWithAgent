---
type: C4 Component
title: 生活管理アシスタントAgent
description: 自然言語を解釈しTool呼び出しを判断するMastra Agent
status: draft
groma:
  id: life-assistant-agent
  parent: backend
  technology: Mastra Agent, Workers AI LLM
---

推測（`docs/overview.md` 3.1節・4.3節`src/mastra/agents/life-assistant.ts`に基づく計画、未実装）。ユーザーの発話・入力からタスク管理Toolと習慣管理ToolのどちらをどのTool呼び出しで実行するかを判断し、応答テキストを生成する。会話履歴はMemoryで保持する。

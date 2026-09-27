---
type: C4 Container
title: フロントエンド
description: チャットUIとPush to Talk録音を提供する静的アセット
status: draft
groma:
  id: frontend
  parent: life-app
  technology: 静的HTML/JS, Web Speech Synthesis API
---

推測（`docs/overview.md` 4.3節のプロジェクト構成に基づく計画、未実装）。チャット履歴の表示、テキスト入力、Push to Talk録音、文字起こし結果の確認・編集、`speechSynthesis`による読み上げを担う。ビルド不要で、backendコンテナと同一デプロイに含まれる。

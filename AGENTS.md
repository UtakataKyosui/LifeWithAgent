# AGENTS.md

このRepositoryで作業するCoding Agent向けの入口ドキュメントである。Claude Code、Codexなど、使用するAgentの種類を問わず共通で適用する。

## 作業の基本手順

まず変更対象の範囲と種別を把握する（Task Analysis）。対象範囲が広い場合、過去の経緯確認が必要な場合、既存の設計判断が関わる場合は、着手前にKnowledge Store（コード構造・過去の経緯・設計判断の索引）に照会し、対象範囲に関係する項目だけを選ぶ。1ファイルに閉じた小さな修正では、この照会を省略してよい。

実装と検証は、Planning・Implementation・Validationのどの段階でも実際のSource Codeを確認しながら進める。Knowledge Storeの回答はどこを読むべきかの手がかりであり、それのみを根拠にコードを変更しない。

作業後、再利用価値のある知識が生まれた場合に限り、既定の書き込み手順でKnowledge Storeを更新する。保存すべき知識がない場合は更新を省略する。

手順の詳細と具体例は [docs/knowledge/agent-workflow.md](./docs/knowledge/agent-workflow.md) を参照する。

## 関連ドキュメント

- [docs/knowledge/agent-workflow.md](./docs/knowledge/agent-workflow.md)（本手順の詳細とウォークスルー）
- [docs/overview.md](./docs/overview.md)（プロジェクトの要求整理書）

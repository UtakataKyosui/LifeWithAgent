# 測定結果テンプレート

1回の測定（Task × 条件 × Agent）ごとに、このテンプレートをコピーして
`YYYY-MM-DD-<task-slug>-<条件>.md` として保存する。定義は `docs/knowledge/measurement.md` を参照する。

## メタ情報

| 項目 | 値 |
|---|---|
| 日付 | |
| Task | |
| 条件 | Knowledgeなし / Knowledgeあり（導入Component: ） |
| Agent | |
| 測定方法（ログ取得の優先順1〜3のどれか） | |
| 実施者 | |

## 効率指標

| 指標 | 値 | 取得不可の場合の理由 |
|---|---|---|
| 探索Tool Call数 | | |
| 読んだFile数 | | |
| 探索時間 | | |
| Context / Token消費量 | | |

## 正確性・Freshness指標

| 指標 | 件数 | 内容 |
|---|---|---|
| 再探索回数 | | |
| Session跨ぎ再利用数 | | |
| Architecture誤解 | | |
| stale Knowledgeによる誤判断 | | |

## Agentの結論（要約）

（Agentが出した結論をそのまま、または要約して記載する）

## 限界・特記事項

（この回の測定で取れなかった指標、測定方法に依存する留保事項を記載する）

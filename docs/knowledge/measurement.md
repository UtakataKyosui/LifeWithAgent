# Knowledge基盤の効果測定方法

Knowledge基盤（Repository Knowledge / Episodic Memory / Architecture Document）の導入前後で、探索コストと正確性・Freshnessをどう比較するかを定義する。親Issue: #26。関連: `docs/knowledge/freshness.md`（#31）、`docs/knowledge/agent-workflow.md`（#33、いずれも他Issueで作成予定）。

## 代表Task

次の3種類から代表Taskを選ぶ。Taskは読み取り専用の調査（コードを変更しない）に限定し、測定のたびにコードベースへ副作用を残さない。

| 種別 | 例 | 何を検証するか |
|---|---|---|
| 構造理解 | 「このRepositoryのCIで何が検査されるかを答える」 | ファイル探索の効率 |
| Architecture理解 | 「〇〇機能はどのモジュールがどう連携して動くかを答える」 | 設計情報の再利用度 |
| 経験参照 | 「過去に似た変更でどう判断したかを答える」 | Episodic Memoryの有効性 |

各種別から最低1つ、合計最低3Taskを固定し、導入前後で同じ文言のまま使う。Task文言を変えると比較が成立しないため、`docs/knowledge/measurements/` に確定した文言をTask定義として保存する。

## 測定条件

| 条件 | 定義 |
|---|---|
| Knowledgeなし（ベースライン） | Knowledge Store・Architecture Document・Episodic Memoryのいずれも存在しない状態。Agentはコードとgit履歴だけを読む |
| Knowledgeあり | 対象のKnowledge基盤（#27〜#33のいずれか）を導入した状態。導入したComponentを明記して測る |

同一Taskを両条件で実施し、Session（Agentの起動単位）は毎回新規にする。前のSessionのContextを引き継がない。

## 効率指標と測定方法

| 指標 | 定義 | 主な取得方法 | 代替（取れない場合） |
|---|---|---|---|
| 探索Tool Call数 | Task開始からAgentが最初の結論を出すまでに呼んだ Read/Grep/Glob/Bash 等のツール呼び出し件数 | Agentのtranscript（実行ログ）から該当ツール名の呼び出し行を数える | Agentが逐次ツール呼び出しを画面出力する場合は出力を人手で数える |
| 読んだFile数 | Tool Call のうちファイル内容を読んだ回数のユニークファイルパス数 | transcript内の Read/Grep/Glob の対象パスを重複排除して数える | 同上。パスが出力されないAgentでは記録不可として「取得不可」と明記する |
| 探索時間 | Task開始からAgentが結論を出すまでの経過時間 | Task開始直後と結論直後に `date +%s` 等で計測した差分。Agentのtranscriptにタイムスタンプがあればそれを使う | 人手でストップウォッチ計測する |
| Context / Token消費量 | Taskの遂行に使ったToken数（input+output） | Agentがtoken使用量をtranscriptやAPIレスポンスのusageフィールドに出す場合はそれを読む | 出力されないAgentでは、Contextに入れた文字数（バイト数）を目安に代替し、Token数と等価でないことを明記する |

### Agentに依存しない取り方

Agentの種類によってログの形式が異なるため、次の優先順で取得する。

1. Agentがtranscript（会話ログ）にツール呼び出しの名前・対象・タイムスタンプ・usageを構造化して出す場合、それをそのまま集計する。
2. 構造化ログがなくツール呼び出しがチャット本文に列挙される場合、本文からツール名と対象パスを人手で数える。
3. ツール呼び出しの記録が一切残らないAgentでは、Task実施者が実施中に自分でメモを取りながら数える。この場合は「観測者が数えた」旨を測定結果に明記する。

複数のAgentで比較する場合は、Agentごとに上記1〜3のどの方法を使ったかを測定結果に必ず書く。方法が異なる指標は数値だけを並べて比較しない。

### 取れない場合の扱い

Token数がAgentから一切得られない場合、その指標は「取得不可」と明記し、代替指標（Context文字数、探索時間、Tool Call数）で代用する。取得不可の指標を0や推定値で埋めない。

## 正確性・Freshness指標

効率が上がっても誤判断が増えていれば導入効果とは言えないため、次を併記する。

| 指標 | 定義 | 記録方法 |
|---|---|---|
| 再探索回数 | 一度読んだはずの情報を同じSession内で再度読み直した回数 | transcriptで同一ファイルパスへのRead/Grepの重複を数える |
| Session跨ぎ再利用数 | 別Sessionで得た知識（Knowledge Store等）を参照できた回数 | Knowledge Storeへのアクセスログ、または結論内でKnowledge由来の記述を引用した箇所を数える |
| Architecture誤解 | Agentの結論が実際のArchitecture（Architecture Documentまたはコードの実態）と矛盾した件数 | 結論を人手でレビューし、矛盾があれば1件として記録する。矛盾の内容を短く書き添える |
| stale Knowledgeによる誤判断 | Knowledge Storeの古い情報を根拠にして誤った結論を出した件数 | 結論の根拠として引用されたKnowledge項目の更新日時と、対象コードの実際の変更日時を比較し、古い情報が誤判断の原因になった場合に1件として記録する |

これらは頻度が低く、代表Task数回では0件になりやすい。0件は「発生しなかった」であり「測定していない」とは区別して記録する。

## 測定結果テンプレート

`docs/knowledge/measurements/template.md` を使う。1回の測定（Task × 条件 × Agent）ごとに1ファイルを作成し、ファイル名は `YYYY-MM-DD-<task-slug>-<条件>.md` とする。

## 限界

- 代表Taskの数が少ないため、統計的な有意差は主張できない。傾向の記録に留める。
- Agentごとにログ形式が異なるため、Tool Call数やToken数を厳密に横並び比較できない場合がある。その場合は測定方法が異なる旨を結果に明記する。
- Architecture誤解・stale Knowledgeによる誤判断はレビュアーの主観判定を含む。判定者を記録し、判定基準の揺れを許容する。

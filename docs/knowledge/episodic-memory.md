# Episodic Memory の設計と検証（Hindsight）

| 項目 | 内容 |
|---|---|
| 対象Issue | #28（親Epic: #26） |
| 検証ツール（第一候補） | [Hindsight](https://hindsight.vectorize.io/)（vectorize-io） |
| 検証日 | 2026-09-27 |
| 検証環境 | ローカルmacOS、Docker（Rancher Desktop） |
| 検証状態 | **一部未達成**（詳細は「4. 検証で確認できたこと・できなかったこと」参照） |

参照した公式ドキュメント（すべて2026-09-27にWebで取得）:

- https://hindsight.vectorize.io/ （Overview）
- https://hindsight.vectorize.io/developer/api/quickstart
- https://hindsight.vectorize.io/developer/installation
- https://hindsight.vectorize.io/developer/retain
- https://hindsight.vectorize.io/developer/api/recall
- https://hindsight.vectorize.io/developer/mental-models

---

## 1. 記憶の単位

Hindsightは`retain()`で投入した内容を、そのまま保存するのではなく分解・抽出して保存する。ドキュメント記載の階層は次の3層。

| 層 | 生成者 | 粒度 | 内容 |
|---|---|---|---|
| Raw facts（fact） | `retain()`が自動生成 | 1文（1事実）単位 | LLMが元テキストから抽出した「何が・いつ・どこで・誰が・なぜ」を含む事実 |
| Observations | Consolidation（自動、バックグラウンド） | 1つの信念（belief）単位 | 複数のfactを束ねた、根拠付きの結論。矛盾するfactが来ると更新される（例: 「Alice はMicrosoft勤務」→「Alice はGoogle勤務」に更新） |
| Mental Models | 人（開発者）が定義 | 1つの質問につき1ドキュメント | 「チームの構成は？」のような固定の問いに対する常時最新の回答。Reflectが最初に参照する |

facts には`type`があり、**世界についての事実**と**エージェント自身の経験**を区別する（後述の「3. 事実と経験の区別」で扱う）。

Decision / Failure / Finding をこの単位に当てはめると次のようになる（ドキュメントに明示的な対応表はなく、下表は`retain`のcontent+contextの使い方から導いた対応で**推測**）。

| Knowledge Store側の区分 | Hindsightでの表現 |
|---|---|
| Decision（決定） | `retain`のcontentに決定内容を記述。contextに「誰が/どのタスクで決定したか」を入れる |
| Failure（失敗） | `retain`のcontentに失敗事象と原因を記述。type推定は`experience`（エージェント自身が遭遇した失敗の場合） |
| Finding（発見） | `retain`のcontentに発見事項を記述。type推定は`world`（コードやシステムについての事実の場合） |

---

## 2. 必須メタデータ

`retain`のリクエストパラメータとして確認できたもの（quickstart / retainドキュメントより）。

| メタデータ | 説明 | 必須か |
|---|---|---|
| `bank_id` | どのMemory Bankに保存するか。テナント/エージェント単位の分離 | 必須 |
| `content` | 保存するテキスト本体 | 必須 |
| `context` | 「誰が話しているか」「何の文脈か」を示すラベル。first-person文をworld/experienceどちらに分類するかに直接影響する | 事実上必須（発話者を明示しないと分類を誤る） |
| `metadata`（dict） | 任意のキー・バリュー。出典（例: `source: "PR #123"`）や対象範囲を持たせられる | 任意だが出典追跡のために付与すべき |
| `tags` | 検索・絞り込み用のタグ | 任意 |
| timestamp（記録日時） | contentがいつ発生した/話されたことかを示す時刻。quickstart例では明示的なタイムスタンプ付きでcontentを渡している | 事実上必須（temporal検索とfreshness判定に使われる） |

`recall`の結果（`RecallResult`）に含まれるメタデータ（recallドキュメントより）。

| フィールド | 内容 |
|---|---|
| `id` | fact ID |
| `text` | 抽出された事実の文 |
| `type` | `world` / `experience` / `observation` |
| `context` | retain時に設定したcontextラベル |
| `metadata` | retain時に設定したdict |
| `tags` | タグ一覧 |
| `entities` | リンクされたエンティティ名一覧 |
| `occurred_start` / `occurred_end` | 事象が発生した期間（ISO日時） |
| `mentioned_at` | その事実が**記録された**日時（ISO日時） |
| `document_id` / `chunk_id` | 出典ドキュメントとチャンクのID |

`occurred_*`（いつ起きたか）と`mentioned_at`（いつ記録されたか）が分かれている点は、保存対象の選別基準（#32）やFreshness判定（#31）で「古い経験」を扱う際に重要な区別になる。

---

## 3. 事実と経験の区別（現在のコード知識 vs 過去の経験）

Hindsightは`recall`の`type`フィールドで3種類を区別する（recall/retainドキュメントより）。

| type | 意味 | Epic #26の区分との対応 |
|---|---|---|
| `world` | エージェント以外（人・システム・コード）についての客観的事実。例:「Alice works at Google」 | 「現在のコードの事実」に近いが、Hindsight自身はソースコードを読むツールではない。**コードの現状はSource Codeを正とする**（Epic #26の基本方針）。Hindsightの`world`は、コードや設計について「誰かが話した/書いた事実」を保存したものであり、コード自体の最新性は保証しない |
| `experience` | Memory Bankを持つエージェント自身の一次的な行動・観察・判断の履歴。例:「I recommended Python to Alice」 | 「過去の経験・判断」に対応。Decision / Failure の多くはここに入る |
| `observation` | 複数のfactを統合した、根拠付きの結論（consolidationが自動生成） | 経験の集約。矛盾解消の履歴（`resolved`）を持つ |

分類は文法（一人称/三人称）ではなく「話者が誰か」で決まる。Hindsight自身が発話者かどうかは`context`で明示する必要がある（例として「Customer Mariaが話している」と明記しないと、Mariaの一人称発言がエージェント自身の`experience`として誤登録される）。

**現在のコードの事実と過去の経験を区別する表示**として、この構成では次の運用を定義する。

- 検索結果を提示するときは、`type`と`mentioned_at`（記録日時）を必ず併記する。
- `type: world`の結果は「〇〇時点で観測された事実（現在のコードと一致するかは要確認）」と明示する。
- `type: experience` / `observation`の結果は「過去の判断・経験」として、コードの現状確認とは別枠で提示する。
- コードの現状に関する判断は、Hindsightの検索結果だけでなく必ずSource Codeの直接確認と併用する（Epic #26の基本方針を継承）。

---

## 4. 検証で確認できたこと・できなかったこと

実行したコマンドと結果を根拠として記す。

### 確認できたこと

- `docker pull ghcr.io/vectorize-io/hindsight:latest` が成功した（`Status: Downloaded newer image for ghcr.io/vectorize-io/hindsight:latest`）。
- `docker run -d --name hindsight-verify --shm-size=1g -p 18888:8888 -p 19999:9999 -e HINDSIGHT_API_LLM_API_KEY=sk-placeholder-not-real -v hindsight-verify-data:/home/hindsight/.pg0 ghcr.io/vectorize-io/hindsight:latest` でコンテナが起動した（`docker ps -a`で`Up`状態を確認）。
- コンテナ内で`/app/start-all.sh`が実行され、`hindsight-api`プロセスと、ヘルスチェック用の`python3 -m hindsight_api.http_probe http://localhost:8888/health 5`プロセスが動作していることを`docker exec ... ps aux`で確認した。
- `curl http://localhost:18888/health`への接続は、起動直後は`Failed to connect`、数十秒後には`Empty reply from server`（TCP接続はできるがHTTPレスポンスがまだ返らない状態）に変化した。ポートの待受自体は始まっていることを確認した。

### 確認できなかったこと（未検証）

- **HTTPの`/health`が200を返すところまで到達しなかった**。ターン上限により、起動完了（ヘルスチェック成功）前に検証を打ち切った。
- **Decision / Failure / Finding の例を`retain`で保存すること**、および**`recall`で検索できること**は未検証。理由は上記の起動未完了と、有効なLLM APIキー（`HINDSIGHT_API_LLM_API_KEY`）を用意していないこと（本セッションの環境にOpenAI/Groq等のAPIキーが設定されていない。`env | grep -iE 'OPENAI|ANTHROPIC|GROQ|LLM_API'`で確認）。公式ドキュメントには「Hindsight requires an LLM with structured output support」と明記されており、`retain`のLLM抽出処理には有効なキーが必須である。
- **別プロセス（別Session相当）からの検索**も、上記の理由により未検証。
- Mental Model・Observationの実際の生成・更新挙動も未検証（ドキュメント記載の仕様のみ確認）。

### 検証環境の後片付け

検証で自分が作成したDockerリソースは撤去済み。

- `docker rm -f hindsight-verify`（コンテナ削除）
- `docker volume rm hindsight-verify-data`（ボリューム削除）
- `docker ps -a --filter name=hindsight-verify`で削除を確認済み

検証環境で稼働していた他タスクのコンテナ（`issue-35-db-1`、`my-agent-os-cloudflare-os-1`、Rancher Desktop起因のk8s系コンテナ群）には一切操作していない。

---

## 5. ツールの不足・置換が必要な点

ドキュメント調査と部分的な起動検証から判明した制約。

| 項目 | 内容 |
|---|---|
| LLM APIキーが起動の必須条件 | `retain`（事実抽出・エンティティ解決）と`reflect`（応答生成）はLLM呼び出しに依存する。キーなしでは保存パイプラインが機能しない可能性が高い（未検証だが、ドキュメント上の必須要件から推測） |
| 起動が重い | フルイメージはローカル埋め込みモデル（BGE, ~130MB）とMiniLMクロスエンコーダ（~90MB）をロードし、アイドルRSSが0.8〜1.0GB程度になるとドキュメントに記載されている。今回の検証環境でもヘルスチェックが数分経過しても完了しなかった（正確な起動所要時間は未計測） |
| Intel Mac非対応の制約 | ドキュメント上、macOS(Intel/x86_64)はフルバンドル(`hindsight-all`)非対応で`hindsight-all-slim`等が必要（今回の検証環境はApple Siliconのため直接は該当しない） |
| 本番運用時の`HINDSIGHT_API_WORKER_ID`固定 | コンテナ再起動時にworker識別子がホスト名（コンテナID）依存になるため、本番では`HINDSIGHT_API_WORKER_ID`を固定する必要がある（ドキュメントで推奨されている） |
| PostgreSQL依存 | pgvector等のベクトル拡張を持つPostgreSQL 14+が必要。開発用途は組込み`pg0`で足りるが、本番用には外部PostgreSQL（Supabase/Neon等）が推奨されている |
| 保存・検索の実地検証が未完了 | 上記の理由（APIキー未用意、起動未完了）により、実際の保存・検索・更新のフローは本セッションでは確認できていない。次回検証時は有効なLLM APIキー（Groq + gpt-oss-20bがドキュメント上の推奨）を用意し、起動完了（`/health`が200を返す）を待ってから`retain`/`recall`/`reflect`を試す必要がある |

---

## 6. 関連

- 保存対象の選別基準: `docs/knowledge/write-policy.md`（#32、本ワークスペースには未作成。並行作業中の他Issueで追加される想定）
- Freshness（鮮度）の判定方法: `docs/knowledge/freshness.md`（#31）

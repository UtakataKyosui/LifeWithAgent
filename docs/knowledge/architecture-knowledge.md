# Architecture Knowledge

Repository Architectureを明示的な設計知識として管理する範囲と、更新・レビューの方法を定義する。実体は`docs/architecture/`にあり、この文書は記述範囲と運用ルールを定める。関連: `docs/architecture/README.md`（採用ツールと制約）、`docs/knowledge/freshness.md`（有効性確認、#31で別途作成予定）。

## 記述範囲

System・Container・Componentの各要素について、次の項目を`docs/architecture/groma/`配下のMarkdownに書く。

| 要素 | 記述する項目 |
| --- | --- |
| System | 責務、対象ユーザー、主要な非機能要件（Requirements節） |
| Container | 責務、デプロイ単位としての境界、採用技術 |
| Component | 責務、依存する他Component・External System、採用技術 |

関係と主要Flowは`docs/architecture/groma/relationships.md`に書く。SourceからTargetへの向き・説明・技術手段の4列表を使う。複数の関係が連なる主要Flow（例: 音声入力からD1書き込みまで）は、表の行の並び順で読める形にする。

記述範囲に含めないもの。

- 個々の関数・クラスの実装詳細。これはSource Codeそのものを正とする
- 実装前の技術選定の比較検討過程。これは`docs/overview.md`のような要求整理ドキュメントの管轄とする
- 過去の設計判断の経緯。`docs/knowledge/`配下の別文書（Episodic Memory等、#28で別途整備）が扱う

## 確認済みと推測の区別

各Markdownの本文冒頭に、次のいずれかを明記する。

- 確認済み。実装したSource Codeのファイルパスを根拠として添える。`groma scan`がComponentのCode参照を記録した場合はそれを根拠にできる
- 推測。参照した計画文書（`docs/overview.md`の節番号等）を根拠として添える

Source Codeが実装され`groma scan`で照合できた要素は、本文を「確認済み」に書き換え、`status: draft`を`status: stable`に変更する。照合の結果、計画と実装が一致しない場合は、実装を正としてMarkdownを修正する。

## 更新責任

設計に影響する変更（Systemの追加・削除、Container境界の変更、Component間の依存関係の変更）を行った人が、同じ変更のコミットまたはPull Requestで対応する`docs/architecture/groma/`配下のMarkdownを更新する。実装のみを変更し設計に影響しない変更（バグ修正、リファクタリング）では更新を求めない。

Agentが実装を変更する場合も同じ基準に従う。Component間の依存関係を追加・削除した場合は、`relationships.md`の該当行を追加・削除・修正する。

## レビュー方法

Architecture Modelの変更を含むPull Requestでは、次を確認する。

- 変更したMarkdownの`status`と本文の確認済み・推測の区別が、実際のSource Codeの状態と一致しているか
- `relationships.md`に追加した行のSourceとTargetが、実在するConcept（System/Container/Component/Actor/External System）を指しているか
- Componentの責務が、対応するSource Codeのディレクトリ・ファイル構成と対応しているか。Source Codeが未実装のComponentは`status: draft`のままでよい

Groma.mdのCLIが使える環境では、`pnpm dlx groma.md@latest scan`と`pnpm dlx groma.md@latest lint`をレビュー時に実行し、重複ロジックの検出結果や、Source Codeとの不整合を確認する。CLIが使えない環境では、Markdownのfrontmatter（`groma.id`の一意性、`groma.parent`の解決可否）を目視で確認する。

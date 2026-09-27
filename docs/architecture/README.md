# Architecture Model

このディレクトリは、Repository の Architecture を明示的に管理する。定義した記述範囲や更新責任は `docs/knowledge/architecture-knowledge.md` を参照する。

## 現在のフェーズと内容

現時点のRepositoryには`docs/overview.md`という要求整理ドキュメントのみがあり、`src/`・`package.json`・`wrangler.jsonc`などの実装は存在しない。確認済み（`jj file list`、リポジトリ直下の`find`結果、2026-09-27時点）。したがって`groma/`以下のArchitecture Modelは、要求整理ドキュメントに基づく計画上のC4モデルであり、実装との照合はまだできていない。各ファイルの本文には確認済みか推測かを明記する。

Source Codeが追加された段階で、`groma scan`を実行してこのモデルとSource Codeを照合し、推測を確認済みに置き換える。

## Groma.mdの検証結果

[Groma.md](https://github.com/MrLesk/Groma.md)を第一候補として検証した（README・`docs/component-markdown.md`をWebFetchで取得、取得日2026-09-27、URL: https://raw.githubusercontent.com/MrLesk/Groma.md/main/README.md および https://raw.githubusercontent.com/MrLesk/Groma.md/main/docs/component-markdown.md）。

確認できたこと。

| 項目 | 内容 |
| --- | --- |
| CLI導入 | `pnpm dlx groma.md@latest --help`が実行できた。macOS arm64向けバイナリ（`groma.md-darwin-arm64@0.5.0`）がダウンロードされる |
| 初期化 | `groma init life-app --directory groma`で`groma/project.md`と`groma/index.md`が生成できた |
| スキャン | `groma scan`は実行できるが、`src/`や`package.json`などのSource Code宣言がないため`created 0, refreshed 0, matched 0`で終わり、Componentが1件も生成されない |
| スキャナ検出 | `groma scanner discover`もSource Code宣言がないため何も推奨しない |
| 形式 | Architecture はOpen Knowledge Format (OKF) 0.2のMarkdownバンドルで、C4（Actor / System / Container / Component）をfrontmatterと本文で表現する。関係は`relationships.md`に表として書く |

確認できなかったこと。

| 項目 | 内容 |
| --- | --- |
| Componentの自動検出 | Source Codeが無いため、TypeScript等のスキャナが実際にComponentを検出する挙動は未検証 |
| `groma web` / `groma view`のブラウザ・ターミナルMap表示 | ヘッドレス環境のため起動を試みていない |
| coding agentによるキュレーション（`groma edit --combine`等） | Component自体が存在しないため未検証 |
| npm公開パッケージの内容の安全性 | `pnpm dlx`経由の一時取得のみで、恒久的な依存追加や監査はしていない |

## 採否判断

Groma.mdはSource Codeをスキャンして最初のC4 Mapを作るツールであり、要求整理のみでSource Codeが無い現フェーズでは、スキャナが動く対象がなく実質的に使えない。一方でOKF形式の記述規約（frontmatterのtype/title/status/groma.id/groma.parent、`## Relationships`セクション）はSource Codeの有無に関係なく採用できるため、このフェーズでは次の方針とする。

- ディレクトリ構成とMarkdown形式はGroma.mdのOKF規約（`groma/project.md`、`groma/systems/<id>/system.md`等）に従う
- 現時点のComponentは`groma scan`ではなく、`docs/overview.md`の計画から人間・Agentが`status: draft`で手書きする
- Source Codeが実装された段階で`groma scan`を実行し、スキャナが検出したComponentと本ディレクトリの`draft`記述を照合する。一致した場合は`status: stable`に更新し、一致しない場合は本ディレクトリを実態に合わせて修正する

## ツールの制約

- macOSではApple Siliconが必要（確認済み、`uname -m`は`arm64`）
- CLI実行には`npm`または`pnpm`のグローバル実行環境が要る。このRepository用workspaceには`npm`/`npx`が無く、`pnpm dlx groma.md@latest <command>`で都度取得して実行する必要がある。確認済み（`which npx`は失敗、`pnpm dlx`は成功）
- `groma scan`はSource Codeの言語別スキャナ（TypeScript/JavaScript/Go等）が対象ファイルを検出できないと何も生成しない。要求整理のみのRepositoryでは常に0件になる
- `groma.md`自体はAIサービスを呼ばない。ComponentのキュレーションはCoding Agent側の作業であり、`groma`コマンドは記述の保存・検証のみを担う

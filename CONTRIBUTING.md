# 開発ガイド

## ローカル開発の方針

このプロジェクトはローカルでも Cloudflare Workers のランタイム（workerd）で動かす。`pnpm build` で Workers 向けにビルドし、その出力を `wrangler dev` で起動する。

`pnpm dev`（`mastra dev`）は使わない。Mastra の設定（`src/mastra/index.ts`）が D1 の Binding を得るために `cloudflare:workers` を import しており、Node.js はこのモジュールを読み込めないため起動に失敗する。

```text
Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. Received protocol 'cloudflare:'
```

この方針により、Mastra Studio（`http://localhost:4111`）はローカルで使えない。動作確認は HTTP API に対して行う。

## 事前準備

1. 依存関係を入れる

   ```shell
   pnpm install
   ```

2. Cloudflare にログインする。Workers AI の Binding はローカル開発中も Cloudflare 上のモデルを呼ぶため、ログインが必要になる

   ```shell
   pnpm exec wrangler login
   ```

3. `.env` にモデルプロバイダの API キーを書く。`wrangler dev` は wrangler 設定と同じディレクトリにある `.env` を読み込む

   ```shell
   OPENAI_API_KEY=...
   ```

## 起動する

```shell
pnpm build
pnpm exec wrangler dev
```

`Ready on http://localhost:8787` と表示されたら起動している。Mastra の API はすべて `/api` 配下にある。

```shell
curl http://localhost:8787/api/agents
```

ソースを変更したら `pnpm build` からやり直す。`wrangler dev` が監視するのはビルド済みの `.mastra/output` であり、`src/` の変更は `pnpm build` を実行するまで反映されない。

## Binding とローカルでの接続先

| Binding | リソース | `wrangler dev` での接続先 |
|---|---|---|
| `env.DB` | D1 `life-with-agent-db` | ローカル（`.wrangler/state/` の SQLite） |
| `env.AI` | Workers AI | リモート（Cloudflare 上で実行され、利用量が計上される） |

ローカルの D1 は本番の D1 と別物である。ローカルのデータを消したいときは `.wrangler/state/` を削除する。`.wrangler/` は `.gitignore` 済み。

## wrangler 設定を変更する

`wrangler.jsonc` は `pnpm build` が `src/mastra/index.ts` の `CloudflareDeployer` から生成する。直接編集しても次のビルドで上書きされるため、Binding や変数は `CloudflareDeployer` の引数に書く。`wrangler.jsonc` は `.gitignore` 済み。

Binding を追加・変更したら、ビルド後に型を生成し直してコミットする。

```shell
pnpm build
pnpm exec wrangler types
```

`worker-configuration.d.ts` が更新され、`env.DB` や `env.AI` の型に反映される。

## ストレージ

`src/mastra/index.ts` の `storage` には `D1Store` を `env.DB` で渡している。D1 は observability ドメインを保存できないため、トレースをストレージに保存する `MastraStorageExporter` は使っていない。

`@mastra/libsql` は依存に加えない。`CloudflareDeployer` はビルド時に `@mastra/libsql` を検出するとエラーで終了する。

## つまずきやすい点

`pnpm dev` を一度でも実行すると、`.mastra/output` が開発用の出力で上書きされる。この状態で `wrangler dev` を起動すると `Cannot find module './.mastra/output/module-stub.mjs'` で失敗する。`pnpm build` を実行し直せば直る。

`mastra dev` のプロセスが残っていると、`pnpm build` が `A mastra dev server is running in this directory` で止まる。表示された PID のプロセスを終了してからビルドする。

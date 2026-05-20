# MEMO APP

Nuxt 4 と Cloudflare Workers/D1 で動作するメモアプリです。Googleログイン後、ログインユーザー単位でメモとタグを管理します。

## 主な機能

- Googleログイン
- タグ別メモ一覧
- メモ作成、編集、自動保存、削除
- タグ検索
- タグ名、タグ色の編集
- タグ作成、削除
- Cloudflare D1 による永続化

## Setup

依存関係をインストールします。

```bash
npm install
```

## Development

Nuxt単体の開発サーバーを起動します。

```bash
npm run dev
```

Cloudflare Workers環境で確認する場合は、ビルド後にWranglerで起動します。

```bash
npm run build
npx wrangler dev
```

`wrangler.toml` のD1 bindingに `remote = true` を設定している場合、ローカル起動でも本番D1に接続します。作成、更新、削除は本番データに反映されます。

## Production Build

```bash
npm run build
```

Workersへデプロイする場合は、ビルド後に以下を実行します。

```bash
npx wrangler --cwd .output deploy
```

Cloudflare WorkersのGitHub連携では、build/deploy設定がWrangler構成と一致している必要があります。

## API Unit Tests

```bash
npm run test:api
```

API実装はCloudflare D1の `DB` bindingを使います。単体テストでは、`event.context.cloudflare.env.DB` にテスト用D1互換オブジェクトを渡します。

## D1

`wrangler.toml` のD1 bindingで接続先を指定します。

```toml
[[d1_databases]]
binding = "DB"
database_name = "memo-db"
database_id = "D1_DATABASE_ID"
```

本番D1へSQLを直接実行する例:

```bash
npx wrangler d1 execute memo-db --remote --command "SELECT * FROM tags LIMIT 10;"
```

## Google Auth

Firebase ConsoleでGoogle認証を有効化し、`.env` にFirebase Webアプリの公開設定を入れます。

```env
NUXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NUXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NUXT_PUBLIC_FIREBASE_APP_ID="your-firebase-app-id"
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID="your-measurement-id"
```

現在のAPIは `ownerUid` をリクエストから受け取ります。本番でAPI保護を強める場合は、Firebase IDトークンをサーバー側で検証し、検証済み `uid` を `ownerUid` として使う構成にしてください。

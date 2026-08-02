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
- Markdown入力とリアルタイムプレビュー（編集・閲覧モード）
- 太字、斜体、赤字、リンク、画像の編集メニューとショートカット
- 画像のファイル選択、貼り付け、ドラッグ＆ドロップおよびCloudflare R2保存
- OS設定を初期値にしたライト・ダークテーマ（右上のボタンで永続切替）

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

`wrangler.toml` のD1 bindingは現在 `remote = true` です。そのため `npx wrangler dev` はローカルPC上で起動しても、本番の `memo-db` を参照します。作成、更新、削除も本番データへ反映されるため、動作確認用のメモを不用意に作らないでください。`npm run dev` だけで起動したNuxtにはWorkersのD1 bindingがなく、D1 APIの確認には適しません。

本番データを使わずに検証する場合は、作業用Wrangler設定でD1 bindingの `remote` を削除または `false` にし、次のように `--local` を明示してください。本番用の `wrangler.toml` をそのままローカル向けに書き換えてコミットしないでください。

```bash
npx wrangler d1 execute memo-db --local --file=path/to/schema.sql
npx wrangler dev --local
```

現在のリポジトリには本番へ自動投入されるseed処理はありません。今回も本番DBへのテストデータ追加は行っていません。

## Production Build

```bash
npm run build
```

Workersへデプロイする場合は、ビルド後に以下を実行します。

```bash
npx wrangler --cwd .output deploy
```

本番URLは `https://memo.kokage-studio.com` です。`wrangler.toml` にCustom Domainを定義していますが、初回はCloudflare Dashboardでゾーンが同じアカウントに登録されていることを確認してください。このリポジトリの検証ではデプロイやDNS変更は実行しません。

## Markdown editor

メモ詳細では `?mode=edit` が左右の入力・プレビュー、`?mode=preview` が閲覧専用です。最後に選んだモードはブラウザに保存されます。通常の見出し、段落、太字、斜体、コード、Markdownリンクに加え、赤字は `==文字=={red}` を利用します。

リンクカードと画像は次の保存形式です。記法の前後には空白行が必要で、違反時は画面に警告が出ます。リンクカードは外部サイトへメタデータ要求を送らず、タイトル・ホスト・URLを表示します。これはSSR時のSSRFと閲覧情報漏えいを避けるためです。

```md
![link]{リンクタイトル}(https://example.com)

![img]{代替テキスト}(/api/images/user-id/object-id.webp)
```

右クリックメニュー、画像貼り付け、画像ドロップが利用できます。画像はPNG/JPEG/GIF/WebP、最大10MBです。

### Keyboard shortcuts

- `Ctrl+Alt+S`: 検索
- `Ctrl+/`: トップ
- `Ctrl+Alt+L`: 検索欄へフォーカス
- `Ctrl+Alt+E` / `Ctrl+Alt+P`: 編集 / 閲覧モード
- `Ctrl+B` / `Ctrl+I` / `Ctrl+Alt+R`: 太字 / 斜体 / 赤字
- `Ctrl+Enter`: 保存

## R2

デプロイ前にR2バケットを作成します。

```bash
npx wrangler r2 bucket create memo-images
npx wrangler types
```

`wrangler.toml` の `MEMO_IMAGES` bindingを変更した場合は、必ず `npx wrangler types` を再実行してください。画像はWorker経由で配信され、Content-Type allowlist、10MB制限、推測困難なUUIDキー、`nosniff`を適用します。現在のアプリ全体と同様にUIDはクライアント入力を利用するため、本番ではCloudflare Zero TrustでWorkerへのアクセスを制限するか、Firebase IDトークン検証をAPI境界に導入してください。

Cloudflare WorkersのGitHub連携では、build/deploy設定がWrangler構成と一致している必要があります。

## API Unit Tests

```bash
npm run test:api
npm run test:unit
npm run typecheck
npm run build
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

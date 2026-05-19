# UserTodo

## Firebase AuthでGoogleログインを本番接続する手順

Firebase Authのクライアント実装は導入済みです。現在のログイン画面はFirebase AuthのGoogleログインを呼び出します。

このアプリでは、Google OAuthを直接実装するよりFirebase Auth経由のほうが楽です。理由は、OAuthクライアントシークレット、コールバックAPI、セッション管理の初期実装を自前で持たず、Firebase JavaScript SDKの `GoogleAuthProvider` と `signInWithPopup` / `signInWithRedirect` で開始できるためです。

## こちらで実装済み

- `firebase` パッケージの追加
- Firebase client pluginの追加
- Firebase Auth composableの追加
- Googleログイン処理の追加
- ログアウト処理の追加
- `onAuthStateChanged` によるログイン状態購読
- `/` のデモログイン処理をFirebase Authへ置き換え

## ユーザー側で必要な設定

1. Firebase Consoleでプロジェクトを作成する。
2. Firebase ConsoleでWebアプリを追加する。
3. Firebase ConsoleのAuthenticationを開く。
4. Sign-in methodでGoogleプロバイダを有効化する。
5. ローカル開発で使うドメインを承認済みドメインに追加する。
   - 例: `localhost`
   - 例: 本番デプロイ先のドメイン
6. Firebase Webアプリの設定値を確認する。
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `appId`
   - `storageBucket`、`messagingSenderId`、`measurementId` はAuthだけなら任意です。
7. `.env` にFirebaseクライアント設定を入力する。
   - `.env` と `.env.example` は作成済みです。
   - Firebase Consoleで確認した値に置き換えてください。

```env
NUXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NUXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NUXT_PUBLIC_FIREBASE_APP_ID="your-firebase-app-id"
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID="your-measurement-id"
```

8. `npm run dev` を起動し、Googleログインが動くことを確認する。
9. バックエンドAPIと接続する段階で、クライアントからFirebase IDトークンを送る。
10. バックエンド側ではFirebase Admin SDKでIDトークンを検証し、検証済み `uid` でメモを絞り込む。

## 実装時の注意

- Firebaseクライアント設定の `apiKey` はブラウザに露出する前提の値です。ただし、Firebase Console側の認証プロバイダ、承認済みドメイン、Firestore/DBのセキュリティルールは必ず設定してください。
- このプロジェクトではまだフロントとモックAPIを接続していません。今回の実装は画面上のログイン状態管理までです。
- Firebase AuthだけではAPI保護は完了しません。APIを本番接続するときは、Firebase IDトークン検証を必ず追加してください。
- 現在の画面内ストアとモックAPIでは、メモに `ownerUid` を持たせてユーザーごとにメモを分離しています。
- モックAPIの `ownerUid` はテスト用の受け渡しです。本番接続時はリクエストbody/queryの `ownerUid` を信用せず、検証済みFirebase `uid` から決定してください。

## データ永続化の作業

現在のメモとタグは `shared/memos.ts` のサンプルデータです。メモには `ownerUid` があり、初期デモデータは `demo-user-001` に紐づいています。本番化する場合は以下を実施してください。

1. データベースを選定する。
2. `memos`、`tags`、`memo_tags`、`users` 相当のデータ構造を作成する。
3. ユーザーIDにはFirebase Authの `uid` を使う。
4. `/api/memos`、`/api/tags`、`/api/search` をデータベース参照に置き換える。
5. すべての検索・作成・更新・削除APIで、検証済みFirebase `uid` を条件に加える。

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
9. Workers/D1環境で確認する場合は `npm run build` 後に `npx wrangler dev` を起動する。
10. API保護を強める段階で、クライアントからFirebase IDトークンを送る。
11. バックエンド側ではFirebase Admin SDKでIDトークンを検証し、検証済み `uid` でメモを絞り込む。

## 実装時の注意

- Firebaseクライアント設定の `apiKey` はブラウザに露出する前提の値です。ただし、Firebase Console側の認証プロバイダ、承認済みドメイン、Firestore/DBのセキュリティルールは必ず設定してください。
- このプロジェクトではフロントからNuxt server APIを呼び出し、API側はCloudflare D1の `DB` bindingを使います。
- Firebase AuthだけではAPI保護は完了しません。APIを本番接続するときは、Firebase IDトークン検証を必ず追加してください。
- 現在のAPIでは、メモとタグに `ownerUid` を持たせてユーザーごとにデータを分離しています。
- 現在の `ownerUid` はクライアントからの受け渡しです。本番API保護を強める場合はリクエストbody/queryの `ownerUid` を信用せず、検証済みFirebase `uid` から決定してください。

## データ永続化の作業

現在のメモとタグはCloudflare D1で永続化します。`shared/memos.ts` には型定義、ID生成、検索補助、テスト用サンプルデータが残っています。

残作業:

1. 本番APIでFirebase IDトークンを検証する。
2. 検証済みFirebase `uid` を `ownerUid` として使い、リクエストbody/queryの `ownerUid` 依存をなくす。
3. 必要に応じてD1のマイグレーション運用を整える。

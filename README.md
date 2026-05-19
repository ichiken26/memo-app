# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Memo App Notes

The mock data source is `shared/memos.ts`.

The mock API handlers under `server/api/` use that shared data source, but the frontend is not connected to the API yet. The current frontend still uses the client-side memo store directly.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## API Unit Tests

Run the API unit tests:

```bash
npm run test:api
```

This executes:

```bash
node --experimental-strip-types --test tests/api.test.ts
```

The API implementation uses Cloudflare D1 through the `DB` binding. Direct handler tests must provide a test D1 binding on `event.context.cloudflare.env.DB`.


# DB接続手順
1. Cloudflare D1を立てる
2. 下記コマンドを実行し、D1のUUIDを取得
```bash
npx wrangler d1 list
```
3. `wrangler.toml`の`database_id`にUUIDを指定する
4. 型定義を更新する
```bash
npx wrangler types
```

# Google認証手順
1. Firebaseプロジェクトを立てる
2. Authenticationから「新たなプロバイダを追加」でGoogleを追加する。サポートメールアドレスを追加する。
3. 以下から`apiKey`, `authDomain`, `projectId`, `appId`をコピーし、
```ts
const firebaseConfig = {
  apiKey: "XXXXXXX",
  authDomain: "XXXXXXX",
  projectId: "XXXXXXX",
  storageBucket: "XXXXXXX",
  messagingSenderId: "XXXXXXX",
  appId: "XXXXXXX",
  measurementId: "XXXXXXX"
};
```

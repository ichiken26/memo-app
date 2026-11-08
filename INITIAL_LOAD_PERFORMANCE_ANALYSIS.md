# 初期表示パフォーマンスの原因分析と設計変更案

## 結論

「本文を含む全メモを1回の大きなJSONで取得していること」は、初期表示が遅い有力な原因候補です。現在の一覧APIにはページングがなく、本文全文とタグを全件返し、クライアントも全件を保持・分類・描画しています。そのため、メモ数、本文長、1メモ当たりのタグ数が増えるほど、DB、転送、JSON処理、Vueの描画が同時に重くなる設計です。

ただし、現時点ではレスポンスサイズや各区間の時間を計測した記録がないため、巨大JSONが「唯一の原因」または「最大の原因」とは断定できません。Firebase認証の確定とトークン取得、初回JavaScriptの読み込み・実行、D1クエリ、DOM生成も直列または同じクリティカルパス上にあります。最初に区間ごとの計測を追加し、その結果を基準に段階的に変更するのが安全です。

## 現在の初期表示経路

1. [`app/plugins/firebase.client.ts`](app/plugins/firebase.client.ts) がFirebaseを初期化する。
2. [`app/composables/useFirebaseAuth.ts`](app/composables/useFirebaseAuth.ts) が認証状態の確定を待つ。
3. 認証ユーザー確定後、[`app/composables/useLoadMemoStoreForUser.ts`](app/composables/useLoadMemoStoreForUser.ts) が `loadForOwner` を開始する。
4. [`app/composables/useMemoStore.ts`](app/composables/useMemoStore.ts) が `GET /api/memos` と `GET /api/tags` を並列実行する。各要求では [`app/composables/useApiFetch.ts`](app/composables/useApiFetch.ts) がFirebase IDトークンを取得する。
5. [`server/api/memos.get.ts`](server/api/memos.get.ts) が [`server/utils/d1.ts`](server/utils/d1.ts) の `listMemosByOwner` を呼ぶ。
6. D1は本文を含む全メモを `memo_tags`、`tags` と `LEFT JOIN` して返し、Workerがタグごとに増えた行をメモ単位へ再集約する。
7. ブラウザが全レスポンスをJSONとして解析し、Nuxtのグローバルstateへ格納する。
8. [`app/pages/index.vue`](app/pages/index.vue) が全メモをタグ別に分類し、[`app/components/MemoPreviewList.vue`](app/components/MemoPreviewList.vue) がカードを生成する。

## ボトルネック候補

優先度は実装から見た可能性と、データ増加時の影響度による仮順位です。実測後に更新します。

| 優先度 | 候補 | コードから確認できる事実 | 未計測の仮説・影響 |
|---|---|---|---|
| 高 | 全件・本文込みの一覧JSON | `listMemosByOwner` は `m.body` を選択し、`LIMIT` がない。`memos.get.ts` は結果をすべて返す | 本文が長い、または件数が多いユーザーほど転送、JSONのserialize/parse、メモリ使用量が増える |
| 高 | 全件および重複DOM描画 | `index.vue` は全件を `groupMemoListByTag` に渡す。`MemoPreviewList.vue` は本文全文をDOMへ入れ、CSSの `overflow` で見た目だけを切る | DOM生成・レイアウト・メモリが初期表示を遅らせる。複数タグのメモはタグごとに同じカードが生成される |
| 高 | D1の全件走査とJOIN行増幅 | `listMemosByOwner` はメモと中間テーブル、タグをJOINする。1メモに複数タグがあればD1結果は複数行になり、`mapMemoRows` がWorker上で再集約する | 件数とタグ数に比例してDB読み取り、Worker処理が増える。実行計画とインデックス有無は未確認 |
| 中 | 認証後にしかデータ取得を開始できない | Firebaseの `onAuthStateChanged` 後にstoreのloadが始まり、APIごとに `getIdToken()` を経由する | SDKのロード、認証復元、必要時のトークン更新が開始時刻を押し下げる可能性がある |
| 中 | 初回JavaScriptの読み込み・実行・hydration | Firebaseに加え、Markdown、KaTeX、Mermaid等の依存がある。実際のチャンク分割状況は未計測 | 初期ルートに不要なコードが初期チャンクへ入っていれば、データ取得前後のmain-threadを圧迫する |
| 中 | クライアントでの全件分類とstate保持 | `useMemoStore.ts` は完全な `Memo[]` をstateへ保存する。`groupMemoListByTag` はタグごとに全メモを `filter` する | タグ数×メモ数の探索と、本文全文の常駐が端末性能に影響する |
| 中 | 詳細画面も全件ロード | [`app/pages/memo/[id].vue`](app/pages/memo/%5Bid%5D.vue) はstore全体をロードしてから1件を探す。一方で `GET /api/memos/{id}` は既に存在する | 詳細URLへの直接アクセスでも不要な全件転送を待つ |
| 中 | 検索もDB内で絞り込んでいない | `server/utils/d1.ts` の `searchMemos` は最初に `listMemosByOwner` を呼び、Worker上の配列をfilterする。通常の検索画面もstore内全件検索を持つ | データ増加時、検索ごとに全本文のDB取得・走査・転送が発生する |
| 低〜中 | メモ・タグを別APIで取得 | 両APIは並列だが、個別に認証検証とD1アクセスを行う | リクエスト固定費が支配的なら統合したbootstrap APIが有利。逆に独立キャッシュ・更新頻度を重視すれば分離が有利 |

## 推奨する目標設計

### 1. 一覧用DTOと詳細DTOを分離する

一覧では本文全文を返さず、表示に必要な情報だけを返します。プレビューが必要なら、保存時またはSQLで生成した上限付き `excerpt` を返します。文字列をクライアントへ全送信してCSSだけで隠す設計は避けます。

```ts
type MemoListItem = {
  id: string;
  title: string;
  updatedAt: string;
  excerpt: string; // 例: 最大160文字。本文全文ではない
  tags: Array<{ id: string; name: string; color: string }>;
};

type MemoDetail = MemoListItem & {
  body: string;
};
```

`ownerUid` は既存どおり検証済みFirebase IDトークンから決め、一覧DTOからは原則省略できます。

### 2. カーソルページネーションを導入する

例: `GET /api/memos?limit=30&cursor=...`

```json
{
  "items": [
    {
      "id": "memo-20260512-example",
      "title": "例",
      "updatedAt": "2026-05-12",
      "excerpt": "本文の先頭を短く整形した文字列…",
      "tags": [{ "id": "tag-1", "name": "Product", "color": "#2563eb" }]
    }
  ],
  "nextCursor": "opaque-signed-or-encoded-cursor",
  "hasMore": true
}
```

並び順は現在の `updated_at DESC, created_at DESC, id ASC` と同じ列をカーソルへ含め、同値でも順序が一意になるようにします。クライアントが解釈できないopaqueな値にし、サーバーで検証します。

OFFSET方式は実装が簡単ですが、深いページほど読み飛ばしが増え、閲覧中の追加・更新で重複や取りこぼしが生じやすくなります。更新日時順が変化するメモ一覧にはカーソル方式が適しています。ただし更新で項目が先頭へ移動するため、storeではIDでupsertし、重複排除したうえで順序を再計算します。削除は全ページのキャッシュからIDで除去します。

### 3. 詳細は1件だけ取得する

`/memo/:id` へ直接アクセスした場合は、既存の `GET /api/memos/{id}` を使って本文とタグを取得します。一覧から遷移した場合はタイトル等を即時表示し、本文を個別取得します。詳細取得結果は `detailById` のようなID単位のキャッシュに置き、一覧DTOと本文のstoreを分離します。

作成・更新レスポンスを受け取ったら、詳細キャッシュを置き換え、一覧側は `id/title/updatedAt/excerpt/tags` だけをupsertします。これにより再度全件取得せず整合性を保てます。

### 4. タグ表示と一覧構造を見直す

`GET /api/tags` は小さい可能性がありますが、実サイズを測って維持・統合を決めます。タグ見出しに件数だけ必要なら、軽量なタグ一覧へ `memoCount` を加えます。

現在のトップは複数タグ付きメモを各タグ欄へ重複描画します。初期画面は「最近更新したメモ30件」の一意なリストを主にし、タグはフィルタまたはタグ別ページへ分ける案が最もスケールしやすいです。現行UIを維持するなら、タグごとに先頭数件だけ返す集約APIと「もっと見る」を用意し、全タグ×全件を一度に描画しません。

### 5. 検索をD1側へ移す

現在のサーバー検索も、全メモを取得してWorker上で本文を走査しています。SQLの `WHERE`、タグ条件、`LIMIT`、カーソルを使って候補を絞り、検索結果も一覧DTOだけ返します。単純な `LIKE` で十分か、D1で利用可能な全文検索方式が必要かは、必要な検索品質、データ量、日本語トークナイズの要件を確認して選びます。検索語やタグ条件に合う索引は実行計画を見て設計します。

### 6. キャッシュはユーザー分離を前提にする

認証済みの個人メモを含むため、ユーザー間で共有されるCDNキャッシュへそのまま保存してはいけません。APIはまず `Cache-Control: private, no-store` を安全な既定値とします。キャッシュする場合も、ブラウザ内のユーザー単位キャッシュ、またはUIDを確実に分離したサーバー側キャッシュとし、ログアウト時に破棄します。`Authorization` を無視する共有キャッシュキーは禁止です。

一覧DTOから本文を除くことは性能だけでなく、ログ、キャッシュ、エラー監視への本文漏洩範囲も減らします。レスポンス本文やAuthorizationヘッダーを計測ログへ記録しないようにします。

## 段階的な移行案

### Phase 0: 先に計測する

- Chrome DevTools NetworkでFirebase関連、`/api/memos`、`/api/tags` の開始時刻、TTFB、Content Download、圧縮後Transfer Size、展開後Resource Sizeを記録する。
- PerformanceパネルでJSON受信後のparse、Vue更新、Recalculate Style、Layout、Paint、long taskを確認する。低速CPU・回線でも測る。
- APIに `Server-Timing` を追加し、少なくとも認証検証、D1、行集約、全体時間を分ける。値だけを記録し、UIDや本文は載せない。
- D1の実行時間、rows read/returned、`EXPLAIN QUERY PLAN`、テーブルとインデックス定義を確認する。
- Nuxtのビルド出力とブラウザCoverageで初期ルートのJS量を確認し、Lighthouseを同じ条件で複数回実行する。
- メモ数、本文合計バイト、タグ関連行数ごとに結果を分ける。平均だけでなくp75/p95を見る。

### Phase 1: 低リスクなquick wins

- 一覧レスポンスとカードから本文全文を除き、上限付き `excerpt` にする。
- 初期表示件数を固定し、「さらに読み込む」を追加する。
- 詳細画面の直接アクセスを個別APIへ切り替える。
- 初期画面で不要なMarkdown/KaTeX/Mermaid等が初期チャンクに含まれていれば、詳細・編集ルートで遅延ロードする。

### Phase 2: API・store・UIをページ単位へ変更する

- `GET /api/memos` を一覧DTO＋カーソル形式へ変更する。
- storeを `listPages/listById/detailById/nextCursor` 等へ分離し、IDによるupsertと重複排除を実装する。
- トップ画面を最近更新順の一意なページング一覧、またはタグごとの件数制限付き一覧にする。
- 作成、更新、削除、タグ変更の成功時に一覧DTOと詳細キャッシュの両方を局所更新する。
- API契約と、ページ境界で同じ更新日時を持つケース、閲覧中の更新・削除、再試行のテストを追加する。

### Phase 3: DBと検索を最適化する

- 実際のクエリプランを基に、ownerと並び順、関連テーブル、検索条件のインデックスを設計する。現在のリポジトリ断片だけから「不足している」とは断定しない。
- 本文検索とタグAND条件をDB側へ移し、結果件数を制限・ページングする。
- JOINの行増幅が支配的なら、一覧本体と対象ページ分のタグ取得を分ける二段階クエリ、または安全な集約方法を比較計測する。
- 実測で必要なら仮想スクロール、IntersectionObserverによる追加取得、ルート別コード分割を導入する。

## 受け入れ指標の例

数値は現状を計測してからチームで確定します。以下は「測定可能な条件」にするための初期案です。

- 初回の一覧APIは常に最大30件で、本文全文を含まない。
- 一覧APIの展開後JSONサイズは、代表データセットで現状比80%以上削減する。
- 一覧APIのServer-Timingにおけるp75とp95を継続記録し、変更前より悪化させない。
- 認証済み状態から最初の30件が操作可能になるまでの時間を、同一端末・同一回線条件で現状比50%以上短縮する。
- 初期描画のメモカードDOM数はページ上限とUI上必要な重複数に制限される。
- LighthouseのLCP/TBTとPerformance記録のlong taskを変更前後で比較し、主要対象端末で回帰がない。
- 31件目以降の取得中も既存一覧を操作でき、重複、欠落、順序崩れがない。
- 別ユーザーの一覧・詳細がブラウザキャッシュ、CDN、ログから取得できないことをテストする。

## 実装前に確認する事項

- 本番ユーザーごとのメモ件数、本文サイズ分布、タグ数分布、現在のJSONサイズ。
- 実測した認証確定時間、API開始時刻、TTFB、download、JSON parse、描画時間。
- D1のテーブル定義、インデックス、実行計画、rows read。リポジトリ内にスキーマ定義が見当たらないため、現状のインデックス有無は判断しない。
- 本番レスポンスで圧縮が有効か、および圧縮前後のサイズ。
- 初期画面で「全タグの全メモ」が本当に必要か、最近更新順の一覧へ変更できるか。
- excerptの生成規則（Markdown記号、個人情報、改行、最大文字数）と、検索結果で必要なスニペット仕様。
- オフライン表示や複数タブ同期が必要か。必要ならユーザー単位キャッシュの失効設計を追加する。

## 推奨する着手順

まずPhase 0で「認証待ち」「API/D1」「転送・JSON」「描画」の比率を可視化します。その計測と並行して、一覧DTOから本文全文を除き、30件のカーソルページングと詳細個別取得を実装するのが効果とリスクのバランスが良い変更です。その後、トップ画面の重複カード構造と検索の全件走査を解消し、最後に実行計画とバンドル分析の結果に応じた最適化を行います。

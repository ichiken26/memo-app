# API仕様書

現在の実装を基準にした Nuxt server API の仕様。データは Cloudflare D1 で永続化する。

メモとタグは Firebase Auth のユーザーID相当の `ownerUid` に紐づけて管理する。作成・更新・検索時はRequest body、参照・削除時はquery parameterで `ownerUid` を必須として受け取る。本番API接続時はクライアント指定値を信用せず、Firebase IDトークンを検証して得た `uid` を `ownerUid` として使う。

## 共通データ型

ID は作成日と名前から生成する。

- メモ ID: `memo-{生成日}-{メモ名}`
- タグ ID: `tag-{生成日}-{タグ名}`
- 生成日は `YYYYMMDD` 形式とする。
- メモ名・タグ名の空白は `-` に置換する。
- 同じ日に同名のメモまたはタグが作成された場合は、末尾に衝突回避用の番号を付ける。

### Memo

```json
{
  "id": "memo-20260512-タグ検索-UI-の検討",
  "ownerUid": "firebase-user-uid",
  "title": "タグ検索 UI の検討",
  "body": "メモ本文",
  "updatedAt": "2026-05-12",
  "tags": [
    { "id": "tag-20260501-Product", "name": "Product", "color": "#2563eb" }
  ]
}
```

### Tag

```json
{
  "id": "tag-20260501-Product",
  "name": "Product",
  "color": "#2563eb"
}
```

タグ色はタグ作成時にサーバー側で決定し、D1 の `tags.color` に保存する。初期色はタグ名の文字コード合計を固定カラーパレットの長さで割った余りから選ぶ。タグ編集画面ではプリセット色またはカラーピッカーで色を選び、`PATCH /api/tags/{tagId}` により任意の色へ更新できる。

## Memo CRUD

### CREATE: POST /api/memos

メモを作成する。

Request:

```json
{
  "ownerUid": "firebase-user-uid",
  "title": "新しいメモ",
  "body": "本文",
  "tags": [
    { "id": "tag-20260501-Product", "name": "Product", "color": "#2563eb" }
  ]
}
```

Response 201:

```json
{
  "memo": {
    "id": "memo-20260516-新しいメモ",
    "ownerUid": "firebase-user-uid",
    "title": "新しいメモ",
    "body": "本文",
    "updatedAt": "2026-05-16",
    "tags": [
      { "id": "tag-20260501-Product", "name": "Product", "color": "#2563eb" }
    ]
  }
}
```

### READ: GET /api/memos

メモ一覧を取得する。`ownerUid` は必須で、そのユーザーに紐づくメモだけを返す。

Query:

```text
ownerUid=firebase-user-uid
```

Response 200:

```json
{
  "memos": []
}
```

### READ: GET /api/memos/{memoId}

指定 ID のメモを取得する。`ownerUid` は必須で、そのユーザーに紐づくメモだけを対象にする。存在しない場合は 404。

Query:

```text
ownerUid=firebase-user-uid
```

Response 200:

```json
{
  "memo": {
    "id": "memo-20260512-タグ検索-UI-の検討",
    "ownerUid": "firebase-user-uid",
    "title": "タグ検索 UI の検討",
    "body": "本文",
    "updatedAt": "2026-05-12",
    "tags": []
  }
}
```

### UPDATE: PATCH /api/memos/{memoId}

指定 ID のメモを更新する。既存メモ画面の自動保存と保存ボタンはこの契約に対応する。

Request:

```json
{
  "ownerUid": "firebase-user-uid",
  "title": "更新後タイトル",
  "body": "更新後本文",
  "tags": [
    { "id": "tag-20260501-Research", "name": "Research", "color": "#059669" }
  ]
}
```

Response 200:

```json
{
  "memo": {
    "id": "memo-20260512-タグ検索-UI-の検討",
    "ownerUid": "firebase-user-uid",
    "title": "更新後タイトル",
    "body": "更新後本文",
    "updatedAt": "2026-05-16",
    "tags": [
      { "id": "tag-20260501-Research", "name": "Research", "color": "#059669" }
    ]
  }
}
```

### DELETE: DELETE /api/memos/{memoId}

指定 ID のメモを削除する。`ownerUid` は必須で、そのユーザーに紐づくメモだけを対象にする。存在しない場合は 404。
トップ画面、検索画面、タグ別一覧、メモ詳細画面の削除UIから利用する。

Query:

```text
ownerUid=firebase-user-uid
```

Response 200:

```json
{
  "deleted": true
}
```

## Tag CRUD

### CREATE: POST /api/tags

タグを作成する。同名タグが存在する場合は既存タグを返す。
タグ管理画面で色を指定して保存ボタンから追加する場合は、作成後に必要に応じて `PATCH /api/tags/{tagId}` で色を更新する。

Request:

```json
{
  "ownerUid": "firebase-user-uid",
  "name": "Design"
}
```

Response 201:

```json
{
  "tag": {
    "id": "tag-20260516-Design",
    "name": "Design",
    "color": "#0891b2"
  }
}
```

### READ: GET /api/tags

指定ユーザーのタグを取得する。`ownerUid` は必須。

Query:

```text
ownerUid=firebase-user-uid
```

Response 200:

```json
{
  "tags": []
}
```

### READ: GET /api/tags/{tagId}

指定 ID のタグを取得する。`ownerUid` は必須で、そのユーザーに紐づくタグだけを対象にする。存在しない場合は 404。

Query:

```text
ownerUid=firebase-user-uid
```

Response 200:

```json
{
  "tag": {
    "id": "tag-20260501-Product",
    "name": "Product",
    "color": "#2563eb"
  }
}
```

### UPDATE: PATCH /api/tags/{tagId}

タグ名または色を更新する。更新後、メモに付与済みの同タグにも反映する。
タグ管理画面ではタグ名またはタグ色の変更後、一定時間後の自動更新で利用する。

Request:

```json
{
  "ownerUid": "firebase-user-uid",
  "name": "Product",
  "color": "#2563eb"
}
```

Response 200:

```json
{
  "tag": {
    "id": "tag-20260501-Product",
    "name": "Product",
    "color": "#2563eb"
  }
}
```

### DELETE: DELETE /api/tags/{tagId}

タグを削除する。`ownerUid` は必須で、そのユーザーに紐づくタグだけを対象にする。削除後、各メモから同タグを外す。
タグ管理画面の削除ボタンから利用する。

Query:

```text
ownerUid=firebase-user-uid
```

Response 200:

```json
{
  "deleted": true
}
```

## Search

### POST /api/search

タグ一致検索と検索ワードの部分一致検索を行う。

Request:

```json
{
  "ownerUid": "firebase-user-uid",
  "search_word": "Nuxt API",
  "tags": [
    { "id": "tag-20260501-Research", "name": "Research" },
    { "id": "tag-20260501-Meeting", "name": "Meeting" }
  ]
}
```

検索条件:

- `search_word` は空白区切りで複数ワードに分割し、全ワードを含むメモを返す。
- ワード検索対象は `title` と `body`。
- `tags` が複数指定された場合、指定されたすべてのタグを持つメモだけを返す。
- `ownerUid` は必須で、そのユーザーに紐づくメモだけを検索対象にする。
- `search_word` と `tags` が空の場合は、そのユーザーの全メモを返す。
- 該当 0 件の場合は `results: []` を返す。

Response 200:

```json
{
  "results": []
}
```

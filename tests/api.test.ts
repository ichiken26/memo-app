import assert from 'node:assert/strict'
import { beforeEach, describe, test } from 'node:test'
import type { Memo, MemoTag } from '../shared/memos.ts'

type TestEvent = {
  body?: unknown
  params?: Record<string, string>
  query?: Record<string, string>
  statusCode?: number
  context: {
    cloudflare: {
      env: {
        DB: TestD1Database
      }
    }
  }
}

type TestD1Database = {
  prepare: (sql: string) => {
    bind: (...values: unknown[]) => {
      all: <T>() => Promise<{ results: T[]; success: boolean; meta: { changes: number } }>
      first: <T>() => Promise<T | null>
      run: () => Promise<{ success: boolean; meta: { changes: number } }>
    }
    all: <T>() => Promise<{ results: T[]; success: boolean; meta: { changes: number } }>
    first: <T>() => Promise<T | null>
    run: () => Promise<{ success: boolean; meta: { changes: number } }>
  }
}

type HttpError = Error & {
  statusCode: number
  statusMessage: string
}

type ApiHandler<TResponse> = (event: TestEvent) => TResponse | Promise<TResponse>

type MemoResponse = { memo: Memo }
type MemosResponse = { memos: Memo[] }
type TagResponse = { tag: MemoTag }
type TagsResponse = { tags: MemoTag[] }
type DeleteResponse = { deleted: true }
type SearchResponse = { results: Memo[] }

type ApiHandlers = {
  listMemos: ApiHandler<MemosResponse>
  createMemo: ApiHandler<MemoResponse>
  getMemo: ApiHandler<MemoResponse>
  updateMemo: ApiHandler<MemoResponse>
  deleteMemo: ApiHandler<DeleteResponse>
  listTags: ApiHandler<TagsResponse>
  createTag: ApiHandler<TagResponse>
  getTag: ApiHandler<TagResponse>
  updateTag: ApiHandler<TagResponse>
  deleteTag: ApiHandler<DeleteResponse>
  search: ApiHandler<SearchResponse>
}

declare global {
  // Minimal Nuxt/h3 globals used by server/api handlers during direct unit tests.
  // eslint-disable-next-line no-var
  var defineEventHandler: <TResponse>(handler: ApiHandler<TResponse>) => ApiHandler<TResponse>
  // eslint-disable-next-line no-var
  var readBody: <TBody>(event: TestEvent) => Promise<TBody>
  // eslint-disable-next-line no-var
  var getRouterParam: (event: TestEvent, name: string) => string | undefined
  // eslint-disable-next-line no-var
  var getQuery: (event: TestEvent) => Record<string, string>
  // eslint-disable-next-line no-var
  var setResponseStatus: (event: TestEvent, statusCode: number) => void
  // eslint-disable-next-line no-var
  var createError: (input: { statusCode: number; statusMessage: string }) => HttpError
}

globalThis.defineEventHandler = (handler) => handler
globalThis.readBody = async (event) => event.body as never
globalThis.getRouterParam = (event, name) => event.params?.[name]
globalThis.getQuery = (event) => event.query ?? {}
globalThis.setResponseStatus = (event, statusCode) => {
  event.statusCode = statusCode
}
globalThis.createError = ({ statusCode, statusMessage }) => {
  const error = new Error(statusMessage) as HttpError
  error.statusCode = statusCode
  error.statusMessage = statusMessage
  return error
}

type UserRow = {
  uid: string
  displayName: string
}

type TagRecord = MemoTag & {
  ownerUid: string
}

type MemoRecord = Omit<Memo, 'tags'> & {
  createdAt: string
}

type MemoTagRecord = {
  memoId: string
  tagId: string
}

const { tags, memos, getToday, toIdDate } = await import('../shared/memos.ts')
let db: MemoryD1Database

class MemoryD1Database {
  users: UserRow[] = []
  tags: TagRecord[] = []
  memos: MemoRecord[] = []
  memoTags: MemoTagRecord[] = []

  prepare(sql: string) {
    return new MemoryD1PreparedStatement(this, sql)
  }
}

class MemoryD1PreparedStatement {
  private readonly db: MemoryD1Database
  private readonly sql: string
  private values: unknown[] = []

  constructor(db: MemoryD1Database, sql: string) {
    this.db = db
    this.sql = sql
  }

  bind(...values: unknown[]) {
    this.values = values
    return this
  }

  async all<T>() {
    return {
      results: queryAll(this.db, this.sql, this.values) as T[],
      success: true,
      meta: { changes: 0 }
    }
  }

  async first<T>() {
    return (queryAll(this.db, this.sql, this.values)[0] as T | undefined) ?? null
  }

  async run() {
    return {
      success: true,
      meta: { changes: runStatement(this.db, this.sql, this.values) }
    }
  }
}

const queryAll = (database: MemoryD1Database, sql: string, values: unknown[]) => {
  const normalizedSql = normalizeSql(sql)

  if (normalizedSql.includes('from memos m')) {
    const ownerUid = String(values.at(-1))
    const memoId = normalizedSql.includes('where m.id = ?') ? String(values[0]) : undefined
    const targetMemos = database.memos
      .filter((memo) => memo.ownerUid === ownerUid && (!memoId || memo.id === memoId))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))

    return targetMemos.flatMap((memo) => {
      const memoTagRows = database.memoTags.filter((memoTag) => memoTag.memoId === memo.id)
      if (memoTagRows.length === 0) {
        return [memoRow(memo, null)]
      }

      return memoTagRows.map((memoTag) => memoRow(memo, database.tags.find((tag) => tag.id === memoTag.tagId) ?? null))
    })
  }

  if (normalizedSql.includes('from memos where id = ?')) {
    const [id] = values.map(String)
    return database.memos.filter((memo) => memo.id === id).map(({ id }) => ({ id }))
  }

  if (normalizedSql.includes('from tags where owner_uid = ? and lower(name) = lower(?)')) {
    const [ownerUid, name] = values.map(String)
    return database.tags.filter((tag) => tag.ownerUid === ownerUid && tag.name.toLowerCase() === name.toLowerCase()).map(tagRow)
  }

  if (normalizedSql.includes('from tags where id = ? and owner_uid = ?')) {
    const [id, ownerUid] = values.map(String)
    return database.tags.filter((tag) => tag.id === id && tag.ownerUid === ownerUid).map(tagRow)
  }

  if (normalizedSql.includes('from tags where id = ?')) {
    const [id] = values.map(String)
    return database.tags.filter((tag) => tag.id === id).map(({ id }) => ({ id }))
  }

  if (normalizedSql.includes('from tags where owner_uid = ?')) {
    const [ownerUid] = values.map(String)
    return database.tags
      .filter((tag) => tag.ownerUid === ownerUid)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(tagRow)
  }

  throw new Error(`Unsupported test query: ${normalizedSql}`)
}

const runStatement = (database: MemoryD1Database, sql: string, values: unknown[]) => {
  const normalizedSql = normalizeSql(sql)

  if (normalizedSql.startsWith('insert into users')) {
    const [uid, displayName] = values.map(String)
    if (!database.users.some((user) => user.uid === uid)) {
      database.users.push({ uid, displayName })
      return 1
    }
    return 0
  }

  if (normalizedSql.startsWith('insert into memos')) {
    const [id, ownerUid, title, body, updatedAt] = values.map(String)
    database.memos.push({ id, ownerUid, title, body, updatedAt, createdAt: getToday() })
    return 1
  }

  if (normalizedSql.startsWith('delete from memo_tags')) {
    const [memoId] = values.map(String)
    const before = database.memoTags.length
    database.memoTags = database.memoTags.filter((memoTag) => memoTag.memoId !== memoId)
    return before - database.memoTags.length
  }

  if (normalizedSql.startsWith('insert or ignore into memo_tags')) {
    const [memoId, tagId] = values.map(String)
    if (database.memoTags.some((memoTag) => memoTag.memoId === memoId && memoTag.tagId === tagId)) {
      return 0
    }
    database.memoTags.push({ memoId, tagId })
    return 1
  }

  if (normalizedSql.startsWith('update memos set')) {
    const [title, body, updatedAt, id, ownerUid] = values.map(String)
    const memo = database.memos.find((currentMemo) => currentMemo.id === id && currentMemo.ownerUid === ownerUid)
    if (!memo) {
      return 0
    }
    Object.assign(memo, { title, body, updatedAt })
    return 1
  }

  if (normalizedSql.startsWith('delete from memos')) {
    const [id, ownerUid] = values.map(String)
    const before = database.memos.length
    database.memos = database.memos.filter((memo) => memo.id !== id || memo.ownerUid !== ownerUid)
    database.memoTags = database.memoTags.filter((memoTag) => database.memos.some((memo) => memo.id === memoTag.memoId))
    return before - database.memos.length
  }

  if (normalizedSql.startsWith('insert into tags')) {
    const [id, ownerUid, name, color] = values.map(String)
    database.tags.push({ id, ownerUid, name, color })
    return 1
  }

  if (normalizedSql.startsWith('update tags set')) {
    const [name, color, id, ownerUid] = values.map(String)
    const tag = database.tags.find((currentTag) => currentTag.id === id && currentTag.ownerUid === ownerUid)
    if (!tag) {
      return 0
    }
    Object.assign(tag, { name, color })
    return 1
  }

  if (normalizedSql.startsWith('delete from tags')) {
    const [id, ownerUid] = values.map(String)
    const before = database.tags.length
    database.tags = database.tags.filter((tag) => tag.id !== id || tag.ownerUid !== ownerUid)
    database.memoTags = database.memoTags.filter((memoTag) => memoTag.tagId !== id)
    return before - database.tags.length
  }

  throw new Error(`Unsupported test statement: ${normalizedSql}`)
}

const normalizeSql = (sql: string) => sql.trim().replace(/\s+/g, ' ').toLowerCase()

const tagRow = ({ id, name, color }: TagRecord) => ({ id, name, color })

const memoRow = (memo: MemoRecord, tag: TagRecord | null) => ({
  id: memo.id,
  ownerUid: memo.ownerUid,
  title: memo.title,
  body: memo.body,
  updatedAt: memo.updatedAt,
  tagId: tag?.id ?? null,
  tagName: tag?.name ?? null,
  tagColor: tag?.color ?? null
})

const createTestDb = () => {
  const database = new MemoryD1Database()
  database.users = [{ uid: 'demo-user-001', displayName: 'Demo User' }]
  database.tags = tags.map((tag) => ({ ...tag, ownerUid: 'demo-user-001' }))
  database.memos = memos.map(({ tags: _tags, ...memo }) => ({ ...memo, createdAt: memo.updatedAt }))
  database.memoTags = memos.flatMap((memo) => memo.tags.map((tag) => ({ memoId: memo.id, tagId: tag.id })))
  return database
}

const loadHandler = async <TResponse>(path: string) =>
  (await import(`${path}?test=${Date.now()}-${Math.random()}`)).default as ApiHandler<TResponse>

const handlers: ApiHandlers = {
  listMemos: await loadHandler<MemosResponse>('../server/api/memos.get.ts'),
  createMemo: await loadHandler<MemoResponse>('../server/api/memos.post.ts'),
  getMemo: await loadHandler<MemoResponse>('../server/api/memos/[id]/index.get.ts'),
  updateMemo: await loadHandler<MemoResponse>('../server/api/memos/[id]/index.patch.ts'),
  deleteMemo: await loadHandler<DeleteResponse>('../server/api/memos/[id]/index.delete.ts'),
  listTags: await loadHandler<TagsResponse>('../server/api/tags.get.ts'),
  createTag: await loadHandler<TagResponse>('../server/api/tags.post.ts'),
  getTag: await loadHandler<TagResponse>('../server/api/tags/[id]/index.get.ts'),
  updateTag: await loadHandler<TagResponse>('../server/api/tags/[id]/index.patch.ts'),
  deleteTag: await loadHandler<DeleteResponse>('../server/api/tags/[id]/index.delete.ts'),
  search: await loadHandler<SearchResponse>('../server/api/search.post.ts')
}

const event = (input: Omit<Partial<TestEvent>, 'context'> = {}): TestEvent => ({
  body: input.body,
  params: input.params,
  query: input.query,
  statusCode: input.statusCode,
  context: {
    cloudflare: {
      env: {
        DB: db
      }
    }
  }
})

beforeEach(() => {
  db = createTestDb()
})

describe('memo API with D1', () => {
  test('GET /api/memos returns memos for owner', async () => {
    const response = await handlers.listMemos(event({ query: { ownerUid: 'demo-user-001' } }))

    assert.equal(response.memos.length, 6)
    assert.equal(response.memos[0].id, 'memo-20260512-タグ検索-UI-の検討')
    assert.equal(response.memos.every((memo) => memo.ownerUid === 'demo-user-001'), true)
  })

  test('GET /api/memos requires ownerUid', async () => {
    await assert.rejects(
      handlers.listMemos(event()),
      (error) => {
        const httpError = error as HttpError
        return httpError.statusCode === 400 && httpError.statusMessage === 'ownerUid is required'
      }
    )
  })

  test('GET /api/memos filters memos by ownerUid', async () => {
    db.users.push({ uid: 'other-user-001', displayName: 'Other User' })
    db.memos.push({
      id: 'memo-20260516-other-user',
      ownerUid: 'other-user-001',
      title: '他ユーザーのメモ',
      body: '他ユーザーの本文',
      updatedAt: '2026-05-16',
      createdAt: '2026-05-16'
    })

    const response = await handlers.listMemos(event({ query: { ownerUid: 'demo-user-001' } }))

    assert.equal(response.memos.length, 6)
    assert.equal(response.memos.every((memo) => memo.ownerUid === 'demo-user-001'), true)
  })

  test('POST /api/memos creates a memo using memo-{date}-{name} id', async () => {
    const request = event({
      body: {
        ownerUid: 'firebase-user-001',
        title: '新しい メモ',
        body: '本文',
        tags: []
      }
    })

    const response = await handlers.createMemo(request)

    assert.equal(request.statusCode, 201)
    assert.equal(response.memo.id, `memo-${toIdDate(getToday())}-新しい-メモ`)
    assert.equal(response.memo.ownerUid, 'firebase-user-001')
    assert.equal(response.memo.title, '新しい メモ')
    assert.equal(response.memo.updatedAt, getToday())
  })

  test('GET /api/memos/{memoId} returns a memo and 404s for missing id', async () => {
    const response = await handlers.getMemo(
      event({ params: { id: 'memo-20260512-タグ検索-UI-の検討' }, query: { ownerUid: 'demo-user-001' } })
    )
    assert.equal(response.memo.title, 'タグ検索 UI の検討')

    await assert.rejects(
      handlers.getMemo(event({ params: { id: 'memo-20260516-missing' }, query: { ownerUid: 'demo-user-001' } })),
      (error) => {
        const httpError = error as HttpError
        return httpError.statusCode === 404 && httpError.statusMessage === 'Memo not found'
      }
    )
  })

  test('PATCH /api/memos/{memoId} updates title, body, tags, and updatedAt', async () => {
    const targetId = 'memo-20260512-タグ検索-UI-の検討'
    const response = await handlers.updateMemo(
      event({
        params: { id: targetId },
        body: {
          title: '更新後タイトル',
          body: '更新後本文',
          tags: [tags[1]],
          ownerUid: 'demo-user-001'
        }
      })
    )

    assert.equal(response.memo.id, targetId)
    assert.equal(response.memo.title, '更新後タイトル')
    assert.equal(response.memo.body, '更新後本文')
    assert.deepEqual(response.memo.tags, [tags[1]])
    assert.equal(response.memo.updatedAt, getToday())
  })

  test('DELETE /api/memos/{memoId} removes a memo', async () => {
    const targetId = 'memo-20260512-タグ検索-UI-の検討'
    const response = await handlers.deleteMemo(
      event({ params: { id: targetId }, query: { ownerUid: 'demo-user-001' } })
    )
    const storedMemo = await handlers.getMemo(
      event({ params: { id: targetId }, query: { ownerUid: 'demo-user-001' } })
    ).catch(() => null)

    assert.deepEqual(response, { deleted: true })
    assert.equal(storedMemo, null)
  })
})

describe('tag API with D1', () => {
  test('GET /api/tags returns owner tags', async () => {
    const response = await handlers.listTags(event({ query: { ownerUid: 'demo-user-001' } }))

    assert.equal(response.tags.length, 5)
    assert.equal(response.tags.some((tag) => tag.id === 'tag-20260501-Product'), true)
  })

  test('POST /api/tags creates a tag using tag-{date}-{name} id', async () => {
    const request = event({ body: { ownerUid: 'demo-user-001', name: 'Design System' } })
    const response = await handlers.createTag(request)

    assert.equal(request.statusCode, 201)
    assert.equal(response.tag.id, `tag-${toIdDate(getToday())}-Design-System`)
    assert.equal(response.tag.name, 'Design System')
  })

  test('POST /api/tags returns existing tag for duplicate name', async () => {
    const response = await handlers.createTag(event({ body: { ownerUid: 'demo-user-001', name: 'Product' } }))

    assert.equal(response.tag.id, 'tag-20260501-Product')
    assert.equal(response.tag.name, 'Product')
  })

  test('GET /api/tags/{tagId} returns a tag and 404s for missing id', async () => {
    const response = await handlers.getTag(
      event({ params: { id: 'tag-20260501-Product' }, query: { ownerUid: 'demo-user-001' } })
    )
    assert.equal(response.tag.name, 'Product')

    await assert.rejects(
      handlers.getTag(event({ params: { id: 'tag-20260516-missing' }, query: { ownerUid: 'demo-user-001' } })),
      (error) => {
        const httpError = error as HttpError
        return httpError.statusCode === 404 && httpError.statusMessage === 'Tag not found'
      }
    )
  })

  test('PATCH /api/tags/{tagId} updates tag', async () => {
    const targetId = 'tag-20260501-Product'
    const response = await handlers.updateTag(
      event({
        params: { id: targetId },
        body: {
          ownerUid: 'demo-user-001',
          name: 'Product Updated',
          color: '#111111'
        }
      })
    )

    assert.deepEqual(response.tag, {
      id: targetId,
      name: 'Product Updated',
      color: '#111111'
    })
  })

  test('DELETE /api/tags/{tagId} removes tag and detaches it from memos', async () => {
    const targetId = 'tag-20260501-Product'
    const response = await handlers.deleteTag(
      event({ params: { id: targetId }, query: { ownerUid: 'demo-user-001' } })
    )
    const memoResponse = await handlers.getMemo(
      event({ params: { id: 'memo-20260512-タグ検索-UI-の検討' }, query: { ownerUid: 'demo-user-001' } })
    )

    assert.deepEqual(response, { deleted: true })
    assert.equal(memoResponse.memo.tags.some((tag) => tag.id === targetId), false)
  })
})

describe('search API with D1', () => {
  test('POST /api/search performs AND partial matching for words', async () => {
    const response = await handlers.search(
      event({
        body: {
          ownerUid: 'demo-user-001',
          search_word: '検索 API',
          tags: []
        }
      })
    )

    assert.deepEqual(
      response.results.map((memo) => memo.id),
      ['memo-20260510-5月定例ミーティング議事録', 'memo-20260503-検索-API-テスト観点']
    )
  })

  test('POST /api/search requires all selected tags', async () => {
    const response = await handlers.search(
      event({
        body: {
          ownerUid: 'demo-user-001',
          search_word: '',
          tags: [
            { id: 'tag-20260501-Research', name: 'Research' },
            { id: 'tag-20260501-Meeting', name: 'Meeting' }
          ]
        }
      })
    )

    assert.deepEqual(
      response.results.map((memo) => memo.id),
      ['memo-20260503-検索-API-テスト観点']
    )
  })

  test('POST /api/search returns empty results when no memo matches', async () => {
    const response = await handlers.search(
      event({
        body: {
          ownerUid: 'demo-user-001',
          search_word: '存在しない検索語',
          tags: []
        }
      })
    )

    assert.deepEqual(response.results, [])
  })
})

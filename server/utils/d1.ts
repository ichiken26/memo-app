/// <reference path="../../worker-configuration.d.ts" />

import { createMemoId, createTagColor, createTagId, getToday, type Memo, type MemoTag } from '../../shared/memos'

type D1Event = {
  context?: {
    cloudflare?: {
      env?: {
        DB?: D1Database
      }
    }
  }
}

type MemoTagRow = {
  id: string
  ownerUid: string
  title: string
  body: string
  updatedAt: string
  tagId: string | null
  tagName: string | null
  tagColor: string | null
}

type TagRow = {
  id: string
  name: string
  color: string
}

type IdRow = {
  id: string
}

export const getDb = (event: D1Event) => {
  const db = event.context?.cloudflare?.env?.DB
  if (!db) {
    throw createError({ statusCode: 500, statusMessage: 'D1 binding DB is not available' })
  }
  return db
}

const mapMemoRows = (rows: MemoTagRow[]) => {
  const memoMap = new Map<string, Memo>()

  for (const row of rows) {
    const memo =
      memoMap.get(row.id) ??
      ({
        id: row.id,
        ownerUid: row.ownerUid,
        title: row.title,
        body: row.body,
        updatedAt: row.updatedAt,
        tags: []
      } satisfies Memo)

    if (row.tagId && row.tagName && row.tagColor && !memo.tags.some((tag) => tag.id === row.tagId)) {
      memo.tags.push({ id: row.tagId, name: row.tagName, color: row.tagColor })
    }

    memoMap.set(row.id, memo)
  }

  return Array.from(memoMap.values())
}

export const listMemosByOwner = async (db: D1Database, ownerUid: string) => {
  const { results } = await db
    .prepare(
      `
      SELECT
        m.id,
        m.owner_uid AS ownerUid,
        m.title,
        m.body,
        m.updated_at AS updatedAt,
        t.id AS tagId,
        t.name AS tagName,
        t.color AS tagColor
      FROM memos m
      LEFT JOIN memo_tags mt ON mt.memo_id = m.id
      LEFT JOIN tags t ON t.id = mt.tag_id
      WHERE m.owner_uid = ?
      ORDER BY m.updated_at DESC, m.created_at DESC, m.id ASC
    `
    )
    .bind(ownerUid)
    .all<MemoTagRow>()

  return mapMemoRows(results)
}

export const getMemoByOwner = async (db: D1Database, id: string, ownerUid: string) => {
  const { results } = await db
    .prepare(
      `
      SELECT
        m.id,
        m.owner_uid AS ownerUid,
        m.title,
        m.body,
        m.updated_at AS updatedAt,
        t.id AS tagId,
        t.name AS tagName,
        t.color AS tagColor
      FROM memos m
      LEFT JOIN memo_tags mt ON mt.memo_id = m.id
      LEFT JOIN tags t ON t.id = mt.tag_id
      WHERE m.id = ? AND m.owner_uid = ?
      ORDER BY t.name ASC
    `
    )
    .bind(id, ownerUid)
    .all<MemoTagRow>()

  return mapMemoRows(results)[0] ?? null
}

export const listTagsByOwner = async (db: D1Database, ownerUid: string) => {
  const { results } = await db
    .prepare('SELECT id, name, color FROM tags WHERE owner_uid = ? ORDER BY name ASC')
    .bind(ownerUid)
    .all<TagRow>()

  return results
}

export const getTagByOwner = async (db: D1Database, id: string, ownerUid: string) => {
  return (
    (await db
      .prepare('SELECT id, name, color FROM tags WHERE id = ? AND owner_uid = ?')
      .bind(id, ownerUid)
      .first<TagRow>()) ?? null
  )
}

export const ensureUser = async (db: D1Database, uid: string) => {
  await db
    .prepare(
      `
      INSERT INTO users (uid, display_name)
      VALUES (?, ?)
      ON CONFLICT (uid) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    `
    )
    .bind(uid, uid)
    .run()
}

export const createMemo = async (
  db: D1Database,
  input: { ownerUid: string; title: string; body: string; tags: MemoTag[] }
) => {
  await ensureUser(db, input.ownerUid)

  const createdAt = getToday()
  const title = input.title.trim() || '無題のメモ'
  const id = await createUniqueMemoId(db, createdAt, title)

  await db
    .prepare('INSERT INTO memos (id, owner_uid, title, body, updated_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, input.ownerUid, title, input.body, createdAt)
    .run()

  await replaceMemoTags(db, id, input.ownerUid, input.tags)

  return (await getMemoByOwner(db, id, input.ownerUid)) as Memo
}

export const updateMemo = async (
  db: D1Database,
  id: string,
  input: { ownerUid: string; title?: string; body?: string; tags?: MemoTag[] }
) => {
  const existing = await getMemoByOwner(db, id, input.ownerUid)
  if (!existing) {
    return null
  }

  const nextTitle = input.title === undefined ? existing.title : input.title.trim() || '無題のメモ'
  const nextBody = input.body === undefined ? existing.body : input.body
  const updatedAt = getToday()

  await db
    .prepare('UPDATE memos SET title = ?, body = ?, updated_at = ? WHERE id = ? AND owner_uid = ?')
    .bind(nextTitle, nextBody, updatedAt, id, input.ownerUid)
    .run()

  if (input.tags !== undefined) {
    await replaceMemoTags(db, id, input.ownerUid, input.tags)
  }

  return await getMemoByOwner(db, id, input.ownerUid)
}

export const deleteMemo = async (db: D1Database, id: string, ownerUid: string) => {
  const result = await db.prepare('DELETE FROM memos WHERE id = ? AND owner_uid = ?').bind(id, ownerUid).run()
  return result.meta.changes > 0
}

export const createTag = async (db: D1Database, ownerUid: string, name: string) => {
  await ensureUser(db, ownerUid)

  const existingTag = await db
    .prepare('SELECT id, name, color FROM tags WHERE owner_uid = ? AND lower(name) = lower(?)')
    .bind(ownerUid, name)
    .first<TagRow>()
  if (existingTag) {
    return { tag: existingTag, created: false }
  }

  const createdAt = getToday()
  const tag = {
    id: await createUniqueTagId(db, createdAt, name),
    name,
    color: createTagColor(name)
  }

  await db
    .prepare('INSERT INTO tags (id, owner_uid, name, color) VALUES (?, ?, ?, ?)')
    .bind(tag.id, ownerUid, tag.name, tag.color)
    .run()

  return { tag, created: true }
}

export const updateTag = async (db: D1Database, id: string, ownerUid: string, input: { name?: string; color?: string }) => {
  const existing = await getTagByOwner(db, id, ownerUid)
  if (!existing) {
    return null
  }

  const nextTag = {
    ...existing,
    ...(input.name !== undefined ? { name: input.name.trim() || existing.name } : {}),
    ...(input.color !== undefined ? { color: input.color } : {})
  }

  await db
    .prepare('UPDATE tags SET name = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_uid = ?')
    .bind(nextTag.name, nextTag.color, id, ownerUid)
    .run()

  return nextTag
}

export const deleteTag = async (db: D1Database, id: string, ownerUid: string) => {
  const result = await db.prepare('DELETE FROM tags WHERE id = ? AND owner_uid = ?').bind(id, ownerUid).run()
  return result.meta.changes > 0
}

export const searchMemos = async (
  db: D1Database,
  input: { ownerUid: string; searchWord: string; tags: Pick<MemoTag, 'id' | 'name'>[] }
) => {
  const memos = await listMemosByOwner(db, input.ownerUid)
  const searchWords = input.searchWord
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  const selectedTagIds = input.tags.map((tag) => tag.id)

  return memos.filter((memo) => {
    const searchableText = `${memo.title} ${memo.body}`.toLowerCase()
    const matchesWord =
      searchWords.length === 0 || searchWords.every((word) => searchableText.includes(word))
    const matchesTags =
      selectedTagIds.length === 0 ||
      selectedTagIds.every((tagId) => memo.tags.some((tag) => tag.id === tagId))

    return matchesWord && matchesTags
  })
}

const replaceMemoTags = async (db: D1Database, memoId: string, ownerUid: string, tags: MemoTag[]) => {
  await db.prepare('DELETE FROM memo_tags WHERE memo_id = ?').bind(memoId).run()

  const tagIds = [...new Set(tags.map((tag) => tag.id))]
  await Promise.all(
    tagIds.map(async (tagId) => {
      const ownedTag = await getTagByOwner(db, tagId, ownerUid)
      if (!ownedTag) {
        return
      }

      await db.prepare('INSERT OR IGNORE INTO memo_tags (memo_id, tag_id) VALUES (?, ?)').bind(memoId, tagId).run()
    })
  )
}

const createUniqueMemoId = async (db: D1Database, date: string, title: string) => {
  const baseId = createMemoId(date, title)
  return await createUniqueId(baseId, async (id) => Boolean(await db.prepare('SELECT id FROM memos WHERE id = ?').bind(id).first<IdRow>()))
}

const createUniqueTagId = async (db: D1Database, date: string, name: string) => {
  const baseId = createTagId(date, name)
  return await createUniqueId(baseId, async (id) => Boolean(await db.prepare('SELECT id FROM tags WHERE id = ?').bind(id).first<IdRow>()))
}

const createUniqueId = async (baseId: string, exists: (id: string) => Promise<boolean>) => {
  if (!(await exists(baseId))) {
    return baseId
  }

  let suffix = 2
  let candidate = `${baseId}-${suffix}`
  while (await exists(candidate)) {
    suffix += 1
    candidate = `${baseId}-${suffix}`
  }

  return candidate
}

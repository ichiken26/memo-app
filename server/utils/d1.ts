/// <reference path="../../worker-configuration.d.ts" />

import {
  createMemoId,
  createTagColor,
  createTagId,
  getToday,
  type Memo,
  type MemoListItem,
  type MemoTag,
  createMemoExcerpt,
} from "../../shared/memos";

type MemoTagRow = {
  id: string;
  ownerUid: string;
  title: string;
  body: string;
  updatedAt: string;
  tagId: string | null;
  tagName: string | null;
  tagColor: string | null;
};

type MemoListRow = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
  createdAt: string;
};

type Cursor = { updatedAt: string; createdAt: string; id: string };
const MAX_SEARCH_WORDS = 8;
const MAX_SEARCH_WORD_LENGTH = 100;
const MAX_SEARCH_TAGS = 20;
const encodeBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};
const decodeBase64Url = (value: string) => {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
};
export const encodeMemoCursor = (cursor: Cursor) => encodeBase64Url(JSON.stringify(cursor));
export const decodeMemoCursor = (value?: string | null): Cursor | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeBase64Url(value)) as Partial<Cursor>;
    if (
      typeof parsed.updatedAt !== "string" ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.id !== "string" ||
      !parsed.updatedAt ||
      !parsed.createdAt ||
      !parsed.id ||
      parsed.updatedAt.length > 100 ||
      parsed.createdAt.length > 100 ||
      parsed.id.length > 512
    ) throw new Error();
    return parsed as Cursor;
  } catch {
    throw createError({ statusCode: 400, statusMessage: "Invalid memo cursor" });
  }
};

type TagRow = {
  id: string;
  name: string;
  color: string;
};

type IdRow = {
  id: string;
};

export const getDb = (event: unknown) => {
  const db = (
    event as { context?: { cloudflare?: { env?: { DB?: D1Database } } } }
  ).context?.cloudflare?.env?.DB;
  if (!db) {
    throw createError({
      statusCode: 500,
      statusMessage: "D1 binding DB is not available",
    });
  }
  return db;
};

const mapMemoRows = (rows: MemoTagRow[]) => {
  const memoMap = new Map<string, Memo>();

  for (const row of rows) {
    const memo =
      memoMap.get(row.id) ??
      ({
        id: row.id,
        ownerUid: row.ownerUid,
        title: row.title,
        body: row.body,
        updatedAt: row.updatedAt,
        tags: [],
      } satisfies Memo);

    if (
      row.tagId &&
      row.tagName &&
      row.tagColor &&
      !memo.tags.some((tag) => tag.id === row.tagId)
    ) {
      memo.tags.push({ id: row.tagId, name: row.tagName, color: row.tagColor });
    }

    memoMap.set(row.id, memo);
  }

  return Array.from(memoMap.values());
};

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
    `,
    )
    .bind(ownerUid)
    .all<MemoTagRow>();

  return mapMemoRows(results);
};

export const listMemoPageByOwner = async (
  db: D1Database,
  input: { ownerUid: string; limit: number; cursor?: Cursor | null; searchWords?: string[]; tagIds?: string[] },
) => {
  const clauses = ["m.owner_uid = ?"];
  const bindings: unknown[] = [input.ownerUid];
  for (const word of input.searchWords ?? []) {
    clauses.push("(lower(m.title) LIKE ? ESCAPE '\\' OR lower(m.body) LIKE ? ESCAPE '\\')");
    const escaped = `%${word.toLowerCase().replace(/[\\%_]/g, "\\$&")}%`;
    bindings.push(escaped, escaped);
  }
  for (const tagId of [...new Set(input.tagIds ?? [])]) {
    clauses.push("EXISTS (SELECT 1 FROM memo_tags wanted WHERE wanted.memo_id = m.id AND wanted.tag_id = ?)");
    bindings.push(tagId);
  }
  if (input.cursor) {
    clauses.push("(m.updated_at < ? OR (m.updated_at = ? AND m.created_at < ?) OR (m.updated_at = ? AND m.created_at = ? AND m.id > ?))");
    bindings.push(input.cursor.updatedAt, input.cursor.updatedAt, input.cursor.createdAt, input.cursor.updatedAt, input.cursor.createdAt, input.cursor.id);
  }
  const { results } = await db.prepare(`
    SELECT m.id, m.title, m.body, m.updated_at AS updatedAt, m.created_at AS createdAt
    FROM memos m WHERE ${clauses.join(" AND ")}
    ORDER BY m.updated_at DESC, m.created_at DESC, m.id ASC LIMIT ?
  `).bind(...bindings, input.limit + 1).all<MemoListRow>();
  const pageRows = results.slice(0, input.limit);
  const ids = pageRows.map((row) => row.id);
  const tagMap = new Map<string, MemoTag[]>();
  if (ids.length) {
    const tagResult = await db.prepare(`
      SELECT mt.memo_id AS memoId, t.id, t.name, t.color
      FROM memo_tags mt JOIN tags t ON t.id = mt.tag_id
      WHERE t.owner_uid = ? AND mt.memo_id IN (${ids.map(() => "?").join(",")})
      ORDER BY t.name ASC
    `).bind(input.ownerUid, ...ids).all<MemoTag & { memoId: string }>();
    for (const row of tagResult.results) tagMap.set(row.memoId, [...(tagMap.get(row.memoId) ?? []), { id: row.id, name: row.name, color: row.color }]);
  }
  const items: MemoListItem[] = pageRows.map((row) => ({ id: row.id, title: row.title, updatedAt: row.updatedAt, excerpt: createMemoExcerpt(row.body), tags: tagMap.get(row.id) ?? [] }));
  const last = pageRows.at(-1);
  return { items, hasMore: results.length > input.limit, nextCursor: results.length > input.limit && last ? encodeMemoCursor(last) : null };
};

export const getMemoByOwner = async (
  db: D1Database,
  id: string,
  ownerUid: string,
) => {
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
    `,
    )
    .bind(id, ownerUid)
    .all<MemoTagRow>();

  return mapMemoRows(results)[0] ?? null;
};

export const listTagsByOwner = async (db: D1Database, ownerUid: string) => {
  const { results } = await db
    .prepare(
      "SELECT id, name, color FROM tags WHERE owner_uid = ? ORDER BY name ASC",
    )
    .bind(ownerUid)
    .all<TagRow>();

  return results;
};

export const getTagByOwner = async (
  db: D1Database,
  id: string,
  ownerUid: string,
) => {
  return (
    (await db
      .prepare(
        "SELECT id, name, color FROM tags WHERE id = ? AND owner_uid = ?",
      )
      .bind(id, ownerUid)
      .first<TagRow>()) ?? null
  );
};

export const ensureUser = async (db: D1Database, uid: string) => {
  await db
    .prepare(
      `
      INSERT INTO users (uid, display_name)
      VALUES (?, ?)
      ON CONFLICT (uid) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    `,
    )
    .bind(uid, uid)
    .run();
};

export const createMemo = async (
  db: D1Database,
  input: { ownerUid: string; title: string; body: string; tags: MemoTag[] },
) => {
  await ensureUser(db, input.ownerUid);

  const createdAt = getToday();
  const title = input.title.trim() || "無題のメモ";
  const id = await createUniqueMemoId(db, createdAt, title);

  await db
    .prepare(
      "INSERT INTO memos (id, owner_uid, title, body, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(id, input.ownerUid, title, input.body, createdAt)
    .run();

  await replaceMemoTags(db, id, input.ownerUid, input.tags);

  return (await getMemoByOwner(db, id, input.ownerUid)) as Memo;
};

export const updateMemo = async (
  db: D1Database,
  id: string,
  input: { ownerUid: string; title?: string; body?: string; tags?: MemoTag[] },
) => {
  const existing = await getMemoByOwner(db, id, input.ownerUid);
  if (!existing) {
    return null;
  }

  const nextTitle =
    input.title === undefined
      ? existing.title
      : input.title.trim() || "無題のメモ";
  const nextBody = input.body === undefined ? existing.body : input.body;
  const updatedAt = getToday();

  await db
    .prepare(
      "UPDATE memos SET title = ?, body = ?, updated_at = ? WHERE id = ? AND owner_uid = ?",
    )
    .bind(nextTitle, nextBody, updatedAt, id, input.ownerUid)
    .run();

  if (input.tags !== undefined) {
    await replaceMemoTags(db, id, input.ownerUid, input.tags);
  }

  return await getMemoByOwner(db, id, input.ownerUid);
};

export const deleteMemo = async (
  db: D1Database,
  id: string,
  ownerUid: string,
) => {
  const result = await db
    .prepare("DELETE FROM memos WHERE id = ? AND owner_uid = ?")
    .bind(id, ownerUid)
    .run();
  return result.meta.changes > 0;
};

export const createTag = async (
  db: D1Database,
  ownerUid: string,
  name: string,
) => {
  await ensureUser(db, ownerUid);

  const existingTag = await db
    .prepare(
      "SELECT id, name, color FROM tags WHERE owner_uid = ? AND lower(name) = lower(?)",
    )
    .bind(ownerUid, name)
    .first<TagRow>();
  if (existingTag) {
    return { tag: existingTag, created: false };
  }

  const createdAt = getToday();
  const tag = {
    id: await createUniqueTagId(db, createdAt, name),
    name,
    color: createTagColor(name),
  };

  await db
    .prepare(
      "INSERT INTO tags (id, owner_uid, name, color) VALUES (?, ?, ?, ?)",
    )
    .bind(tag.id, ownerUid, tag.name, tag.color)
    .run();

  return { tag, created: true };
};

export const updateTag = async (
  db: D1Database,
  id: string,
  ownerUid: string,
  input: { name?: string; color?: string },
) => {
  const existing = await getTagByOwner(db, id, ownerUid);
  if (!existing) {
    return null;
  }

  const nextTag = {
    ...existing,
    ...(input.name !== undefined
      ? { name: input.name.trim() || existing.name }
      : {}),
    ...(input.color !== undefined ? { color: input.color } : {}),
  };

  await db
    .prepare(
      "UPDATE tags SET name = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_uid = ?",
    )
    .bind(nextTag.name, nextTag.color, id, ownerUid)
    .run();

  return nextTag;
};

export const deleteTag = async (
  db: D1Database,
  id: string,
  ownerUid: string,
) => {
  const result = await db
    .prepare("DELETE FROM tags WHERE id = ? AND owner_uid = ?")
    .bind(id, ownerUid)
    .run();
  return result.meta.changes > 0;
};

export const searchMemos = async (
  db: D1Database,
  input: {
    ownerUid: string;
    searchWord: string;
    tags: Pick<MemoTag, "id" | "name">[];
    cursor?: Cursor | null;
    limit?: number;
  },
) => {
  const searchWords = input.searchWord
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_SEARCH_WORDS)
    .map((word) => word.slice(0, MAX_SEARCH_WORD_LENGTH));
  return listMemoPageByOwner(db, {
    ownerUid: input.ownerUid,
    searchWords,
    tagIds: input.tags.map((tag) => tag.id).filter(Boolean).slice(0, MAX_SEARCH_TAGS),
    limit: input.limit ?? 30,
    cursor: input.cursor,
  });
};

const replaceMemoTags = async (
  db: D1Database,
  memoId: string,
  ownerUid: string,
  tags: MemoTag[],
) => {
  await db
    .prepare("DELETE FROM memo_tags WHERE memo_id = ?")
    .bind(memoId)
    .run();

  const tagIds = [...new Set(tags.map((tag) => tag.id))];
  await Promise.all(
    tagIds.map(async (tagId) => {
      const ownedTag = await getTagByOwner(db, tagId, ownerUid);
      if (!ownedTag) {
        return;
      }

      await db
        .prepare(
          "INSERT OR IGNORE INTO memo_tags (memo_id, tag_id) VALUES (?, ?)",
        )
        .bind(memoId, tagId)
        .run();
    }),
  );
};

const createUniqueMemoId = async (
  db: D1Database,
  date: string,
  title: string,
) => {
  const baseId = createMemoId(date, title);
  return await createUniqueId(baseId, async (id) =>
    Boolean(
      await db
        .prepare("SELECT id FROM memos WHERE id = ?")
        .bind(id)
        .first<IdRow>(),
    ),
  );
};

const createUniqueTagId = async (
  db: D1Database,
  date: string,
  name: string,
) => {
  const baseId = createTagId(date, name);
  return await createUniqueId(baseId, async (id) =>
    Boolean(
      await db
        .prepare("SELECT id FROM tags WHERE id = ?")
        .bind(id)
        .first<IdRow>(),
    ),
  );
};

const createUniqueId = async (
  baseId: string,
  exists: (id: string) => Promise<boolean>,
) => {
  if (!(await exists(baseId))) {
    return baseId;
  }

  let suffix = 2;
  let candidate = `${baseId}-${suffix}`;
  while (await exists(candidate)) {
    suffix += 1;
    candidate = `${baseId}-${suffix}`;
  }

  return candidate;
};

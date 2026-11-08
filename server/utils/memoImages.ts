const IMAGE_NOTATION_RE = /!\[img\]\{[^}]*\}\((https?:\/\/[^\s)]+)\)/g;
const IMAGE_ROUTE_PREFIX = "/api/images/";
const R2_IMAGE_NAME_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|jpe?g|gif|webp)$/i;

export const extractOwnedMemoImageKeys = (body: string, ownerUid: string) => {
  const keys = new Set<string>();

  for (const match of body.matchAll(IMAGE_NOTATION_RE)) {
    try {
      const pathname = new URL(match[1]!).pathname;
      if (!pathname.startsWith(IMAGE_ROUTE_PREFIX)) continue;

      const key = decodeURIComponent(pathname.slice(IMAGE_ROUTE_PREFIX.length));
      const ownerPrefix = `${ownerUid}/`;
      if (!key.startsWith(ownerPrefix)) continue;

      const imageName = key.slice(ownerPrefix.length);
      if (R2_IMAGE_NAME_RE.test(imageName)) keys.add(key);
    } catch {
      // Ignore malformed or unrelated URLs in memo text.
    }
  }

  return keys;
};

/** R2 キー（`{ownerUid}/{uuid}.{ext}`）からファイル名部分を取り出す */
const imageFileName = (key: string) => key.slice(key.lastIndexOf("/") + 1);

/**
 * 画像がまだ使われているか判定する。ファイル名（UUID）が本文に含まれていれば参照ありとみなす。
 * URL のエンコード有無や記法の崩れに関係なく拾えるよう、あえて緩く判定する（誤判定は「消さない」側に倒れる）。
 */
export const isImageReferenced = (key: string, bodies: Iterable<string>) => {
  const fileName = imageFileName(key);
  for (const body of bodies) if (body.includes(fileName)) return true;
  return false;
};

const findReferencedKeys = async (
  db: D1Database,
  ownerUid: string,
  keys: string[],
) => {
  const referenced = new Set<string>();
  for (const key of keys) {
    const row = await db
      .prepare(
        "SELECT 1 AS found FROM memos WHERE owner_uid = ? AND instr(body, ?) > 0 LIMIT 1",
      )
      .bind(ownerUid, imageFileName(key))
      .first<{ found: number }>();
    if (row) referenced.add(key);
  }
  return referenced;
};

/** R2 の削除失敗でメモ保存自体を失敗させない（取りこぼしは定期クリーンアップで回収する） */
const deleteKeysSafely = async (bucket: R2Bucket, keys: string[]) => {
  if (!keys.length) return 0;
  try {
    await bucket.delete(keys);
    return keys.length;
  } catch (error) {
    console.error("[memo-images] failed to delete R2 objects", {
      count: keys.length,
      message: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
};

/**
 * メモ更新・削除後に呼ぶ。D1 への反映が済んだ状態で、本文から外れた画像のうち
 * 同じユーザーの他メモからも参照されていないものだけを R2 から削除する。
 */
export const deleteRemovedMemoImages = async (
  bucket: R2Bucket | undefined,
  db: D1Database,
  ownerUid: string,
  previousBody: string,
  nextBody: string,
) => {
  if (!bucket) return;

  const previousKeys = extractOwnedMemoImageKeys(previousBody, ownerUid);
  const nextKeys = extractOwnedMemoImageKeys(nextBody, ownerUid);
  const candidates = [...previousKeys].filter((key) => !nextKeys.has(key));
  if (!candidates.length) return;

  let referenced: Set<string>;
  try {
    referenced = await findReferencedKeys(db, ownerUid, candidates);
  } catch (error) {
    console.error("[memo-images] failed to check image references", {
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }
  await deleteKeysSafely(
    bucket,
    candidates.filter((key) => !referenced.has(key)),
  );
};

export const ORPHAN_IMAGE_GRACE_MS = 24 * 60 * 60 * 1000;
const MAX_LIST_PAGES = 20; // 1ページ最大1000件 → 1回の実行で最大2万件を確認

/**
 * どのメモからも参照されていない画像を削除する（Cron から実行）。
 * 保存前の編集中画像を消さないよう、アップロードから猶予時間を過ぎたものだけを対象にする。
 */
export const cleanupOrphanedMemoImages = async (
  bucket: R2Bucket,
  db: D1Database,
  options: { now?: number; graceMs?: number } = {},
) => {
  const threshold =
    (options.now ?? Date.now()) - (options.graceMs ?? ORPHAN_IMAGE_GRACE_MS);
  const candidatesByOwner = new Map<string, string[]>();
  let scanned = 0;
  let cursor: string | undefined;
  let truncated = false;

  for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
    const listed = await bucket.list({ cursor, limit: 1000 });
    for (const object of listed.objects) {
      scanned += 1;
      if (object.uploaded.getTime() > threshold) continue;
      const slash = object.key.indexOf("/");
      if (slash <= 0) continue;
      const ownerUid = object.key.slice(0, slash);
      if (!R2_IMAGE_NAME_RE.test(object.key.slice(slash + 1))) continue;
      candidatesByOwner.set(ownerUid, [
        ...(candidatesByOwner.get(ownerUid) ?? []),
        object.key,
      ]);
    }
    truncated = listed.truncated;
    if (!listed.truncated) break;
    cursor = listed.cursor;
  }

  let deleted = 0;
  for (const [ownerUid, keys] of candidatesByOwner) {
    const { results } = await db
      .prepare("SELECT body FROM memos WHERE owner_uid = ?")
      .bind(ownerUid)
      .all<{ body: string }>();
    const bodies = results.map((row) => row.body);
    const orphaned = keys.filter((key) => !isImageReferenced(key, bodies));
    // R2 の一括削除は1回最大1000件
    for (let i = 0; i < orphaned.length; i += 1000) {
      deleted += await deleteKeysSafely(bucket, orphaned.slice(i, i + 1000));
    }
  }

  return { scanned, deleted, truncated };
};

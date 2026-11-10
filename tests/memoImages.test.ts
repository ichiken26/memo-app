import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ORPHAN_IMAGE_GRACE_MS,
  cleanupOrphanedMemoImages,
  deleteRemovedMemoImages,
  extractOwnedMemoImageKeys,
} from "../server/utils/memoImages.ts";

const ownerUid = "firebase-user-001";
const firstKey = `${ownerUid}/11111111-1111-4111-8111-111111111111.webp`;
const secondKey = `${ownerUid}/22222222-2222-4222-8222-222222222222.png`;
const imageNotation = (key: string) =>
  `![img]{画像}(https://memo.example/api/images/${encodeURIComponent(key)})`;

type MemoRow = { ownerUid: string; body: string };

/** memoImages.ts が発行する2種類のクエリだけを解釈する D1 のスタブ */
const fakeDb = (memos: MemoRow[]) =>
  ({
    prepare: (sql: string) => ({
      bind: (...values: unknown[]) => ({
        first: async () => {
          assert.match(sql, /instr\(body, \?\)/);
          const [owner, needle] = values.map(String);
          return memos.some((m) => m.ownerUid === owner && m.body.includes(needle!))
            ? { found: 1 }
            : null;
        },
        all: async () => {
          assert.match(sql, /SELECT body FROM memos WHERE owner_uid = \?/);
          return {
            results: memos
              .filter((m) => m.ownerUid === String(values[0]))
              .map(({ body }) => ({ body })),
          };
        },
      }),
    }),
  }) as unknown as D1Database;

const fakeBucket = (
  objects: { key: string; uploaded: Date }[] = [],
  options: { failDelete?: boolean } = {},
) => {
  const deletedKeys: string[] = [];
  const bucket = {
    delete: async (keys: string | string[]) => {
      if (options.failDelete) throw new Error("R2 unavailable");
      deletedKeys.push(...(Array.isArray(keys) ? keys : [keys]));
    },
    list: async () => ({ objects, truncated: false }),
  } as unknown as R2Bucket;
  return { bucket, deletedKeys };
};

describe("memo image cleanup", () => {
  test("extracts only R2 image keys owned by the authenticated user", () => {
    const body = [
      imageNotation(firstKey),
      imageNotation("other-user/33333333-3333-4333-8333-333333333333.webp"),
      "![img]{外部画像}(https://example.com/image.webp)",
      "![link]{リンク}(https://memo.example/api/images/firebase-user-001%2F44444444-4444-4444-8444-444444444444.webp)",
    ].join("\n\n");

    assert.deepEqual([...extractOwnedMemoImageKeys(body, ownerUid)], [firstKey]);
  });

  test("deletes an owned R2 image when its URL is removed from the memo", async () => {
    const { bucket, deletedKeys } = fakeBucket();
    // 更新後の本文はすでに D1 に保存されている前提
    const db = fakeDb([{ ownerUid, body: imageNotation(secondKey) }]);

    await deleteRemovedMemoImages(
      bucket,
      db,
      ownerUid,
      `${imageNotation(firstKey)}\n\n${imageNotation(secondKey)}`,
      imageNotation(secondKey),
    );

    assert.deepEqual(deletedKeys, [firstKey]);
  });

  test("does not delete an image while its URL remains in the memo", async () => {
    const { bucket, deletedKeys } = fakeBucket();
    const db = fakeDb([{ ownerUid, body: imageNotation(firstKey) }]);

    await deleteRemovedMemoImages(
      bucket,
      db,
      ownerUid,
      imageNotation(firstKey),
      imageNotation(firstKey),
    );

    assert.deepEqual(deletedKeys, []);
  });

  test("keeps an image that another memo of the same owner still uses", async () => {
    const { bucket, deletedKeys } = fakeBucket();
    const db = fakeDb([
      { ownerUid, body: "画像を消したメモ" },
      { ownerUid, body: `別メモ\n\n${imageNotation(firstKey)}` },
    ]);

    await deleteRemovedMemoImages(bucket, db, ownerUid, imageNotation(firstKey), "");

    assert.deepEqual(deletedKeys, []);
  });

  test("does not throw when R2 deletion fails", async () => {
    const { bucket } = fakeBucket([], { failDelete: true });
    const db = fakeDb([]);
    const originalError = console.error;
    console.error = () => {};
    try {
      await deleteRemovedMemoImages(bucket, db, ownerUid, imageNotation(firstKey), "");
    } finally {
      console.error = originalError;
    }
  });

  test("periodic cleanup deletes only old, unreferenced images", async () => {
    const now = Date.parse("2026-11-10T00:00:00Z");
    const old = new Date(now - ORPHAN_IMAGE_GRACE_MS - 1000);
    const recent = new Date(now - 60 * 1000);
    const orphanKey = `${ownerUid}/55555555-5555-4555-8555-555555555555.jpg`;
    const recentKey = `${ownerUid}/66666666-6666-4666-8666-666666666666.gif`;
    const { bucket, deletedKeys } = fakeBucket([
      { key: firstKey, uploaded: old }, // 参照あり
      { key: orphanKey, uploaded: old }, // 参照なし・猶予切れ → 削除
      { key: recentKey, uploaded: recent }, // 参照なし・猶予内（編集中かもしれない）
      { key: "not-an-image.txt", uploaded: old }, // 想定外のキー
    ]);
    // URL を記法外に貼っただけ（未エンコード）でも参照ありとみなす
    const db = fakeDb([
      { ownerUid, body: `メモ https://memo.example/api/images/${firstKey}` },
    ]);

    const result = await cleanupOrphanedMemoImages(bucket, db, { now });

    assert.deepEqual(deletedKeys, [orphanKey]);
    assert.deepEqual(result, { scanned: 4, deleted: 1, truncated: false });
  });
});

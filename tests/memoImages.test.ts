import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  deleteRemovedMemoImages,
  extractOwnedMemoImageKeys,
} from "../server/utils/memoImages.ts";

const ownerUid = "firebase-user-001";
const firstKey = `${ownerUid}/11111111-1111-4111-8111-111111111111.webp`;
const secondKey = `${ownerUid}/22222222-2222-4222-8222-222222222222.png`;
const imageNotation = (key: string) =>
  `![img]{画像}(https://memo.example/api/images/${encodeURIComponent(key)})`;

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
    const deletedKeys: string[] = [];
    const bucket = {
      delete: async (keys: string | string[]) => {
        deletedKeys.push(...(Array.isArray(keys) ? keys : [keys]));
      },
    } as R2Bucket;

    await deleteRemovedMemoImages(
      bucket,
      ownerUid,
      `${imageNotation(firstKey)}\n\n${imageNotation(secondKey)}`,
      imageNotation(secondKey),
    );

    assert.deepEqual(deletedKeys, [firstKey]);
  });

  test("does not delete an image while its URL remains in the memo", async () => {
    const deletedKeys: string[] = [];
    const bucket = {
      delete: async (keys: string | string[]) => {
        deletedKeys.push(...(Array.isArray(keys) ? keys : [keys]));
      },
    } as R2Bucket;

    await deleteRemovedMemoImages(
      bucket,
      ownerUid,
      imageNotation(firstKey),
      imageNotation(firstKey),
    );

    assert.deepEqual(deletedKeys, []);
  });
});

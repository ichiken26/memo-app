import type { MemoTag } from "../../../../shared/memos";
import { getDb, getMemoByOwner, updateMemo } from "../../../utils/d1";
import { requireFirebaseUser } from "../../../utils/firebaseAuth";
import { deleteRemovedMemoImages } from "../../../utils/memoImages";

type UpdateMemoBody = {
  title?: string;
  body?: string;
  tags?: MemoTag[];
};

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  const body = await readBody<UpdateMemoBody>(event);
  const { uid: ownerUid } = await requireFirebaseUser(event);
  const db = getDb(event);
  const previousMemo = await getMemoByOwner(db, id, ownerUid);

  if (!previousMemo) {
    throw createError({ statusCode: 404, statusMessage: "Memo not found" });
  }

  const memo = await updateMemo(db, id, {
    ownerUid,
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.body !== undefined ? { body: body.body } : {}),
    ...(body.tags !== undefined ? { tags: body.tags } : {}),
  });

  if (!memo) {
    throw createError({ statusCode: 404, statusMessage: "Memo not found" });
  }

  const bucket = event.context.cloudflare?.env?.MEMO_IMAGES as
    | R2Bucket
    | undefined;
  await deleteRemovedMemoImages(
    bucket,
    db,
    ownerUid,
    previousMemo.body,
    memo.body,
  );

  return { memo };
});

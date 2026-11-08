import { deleteMemo, getDb, getMemoByOwner } from "../../../utils/d1";
import { requireFirebaseUser } from "../../../utils/firebaseAuth";
import { deleteRemovedMemoImages } from "../../../utils/memoImages";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  const { uid: ownerUid } = await requireFirebaseUser(event);
  const db = getDb(event);
  const memo = await getMemoByOwner(db, id, ownerUid);

  if (!memo || !(await deleteMemo(db, id, ownerUid))) {
    throw createError({ statusCode: 404, statusMessage: "Memo not found" });
  }

  const bucket = event.context.cloudflare?.env?.MEMO_IMAGES as
    | R2Bucket
    | undefined;
  await deleteRemovedMemoImages(bucket, ownerUid, memo.body, "");

  return { deleted: true };
});

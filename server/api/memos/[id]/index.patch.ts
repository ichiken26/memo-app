import type { MemoTag } from "../../../../shared/memos";
import { getDb, updateMemo } from "../../../utils/d1";
import { requireFirebaseUser } from "../../../utils/firebaseAuth";

type UpdateMemoBody = {
  title?: string;
  body?: string;
  tags?: MemoTag[];
};

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  const body = await readBody<UpdateMemoBody>(event);
  const { uid: ownerUid } = await requireFirebaseUser(event);

  const memo = await updateMemo(getDb(event), id, {
    ownerUid,
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.body !== undefined ? { body: body.body } : {}),
    ...(body.tags !== undefined ? { tags: body.tags } : {}),
  });

  if (!memo) {
    throw createError({ statusCode: 404, statusMessage: "Memo not found" });
  }

  return { memo };
});

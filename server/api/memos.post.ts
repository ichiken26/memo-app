import type { MemoTag } from "../../shared/memos";
import { createMemo, getDb } from "../utils/d1";
import { requireFirebaseUser } from "../utils/firebaseAuth";

type CreateMemoBody = {
  title: string;
  body: string;
  tags: MemoTag[];
};

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateMemoBody>(event);
  const { uid: ownerUid } = await requireFirebaseUser(event);

  const memo = await createMemo(getDb(event), {
    ownerUid,
    title: body.title ?? "",
    body: body.body ?? "",
    tags: body.tags ?? [],
  });
  setResponseStatus(event, 201);
  return { memo };
});

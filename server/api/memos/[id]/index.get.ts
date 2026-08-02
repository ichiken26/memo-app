import { getDb, getMemoByOwner } from "../../../utils/d1";
import { requireFirebaseUser } from "../../../utils/firebaseAuth";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  const { uid: ownerUid } = await requireFirebaseUser(event);

  const memo = await getMemoByOwner(getDb(event), id, ownerUid);

  if (!memo) {
    throw createError({ statusCode: 404, statusMessage: "Memo not found" });
  }

  return { memo };
});

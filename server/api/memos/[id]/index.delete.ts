import { deleteMemo, getDb } from "../../../utils/d1";
import { requireFirebaseUser } from "../../../utils/firebaseAuth";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  const { uid: ownerUid } = await requireFirebaseUser(event);

  if (!(await deleteMemo(getDb(event), id, ownerUid))) {
    throw createError({ statusCode: 404, statusMessage: "Memo not found" });
  }

  return { deleted: true };
});

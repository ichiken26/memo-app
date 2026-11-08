import { deleteTag, getDb } from "../../../utils/d1";
import { requireFirebaseUser } from "../../../utils/firebaseAuth";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  const { uid: ownerUid } = await requireFirebaseUser(event);

  if (!(await deleteTag(getDb(event), id, ownerUid))) {
    throw createError({ statusCode: 404, statusMessage: "Tag not found" });
  }

  return { deleted: true };
});

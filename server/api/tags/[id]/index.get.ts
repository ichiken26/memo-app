import { getDb, getTagByOwner } from "../../../utils/d1";
import { requireFirebaseUser } from "../../../utils/firebaseAuth";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  const { uid: ownerUid } = await requireFirebaseUser(event);

  const tag = await getTagByOwner(getDb(event), id, ownerUid);

  if (!tag) {
    throw createError({ statusCode: 404, statusMessage: "Tag not found" });
  }

  return { tag };
});

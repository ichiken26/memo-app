import { getDb, listTagsByOwner } from "../utils/d1";
import { requireFirebaseUser } from "../utils/firebaseAuth";

export default defineEventHandler(async (event) => {
  const { uid: ownerUid } = await requireFirebaseUser(event);

  return { tags: await listTagsByOwner(getDb(event), ownerUid) };
});

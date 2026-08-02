import { getDb, listMemosByOwner } from "../utils/d1";
import { requireFirebaseUser } from "../utils/firebaseAuth";

export default defineEventHandler(async (event) => {
  const { uid: ownerUid } = await requireFirebaseUser(event);

  return {
    memos: await listMemosByOwner(getDb(event), ownerUid),
  };
});

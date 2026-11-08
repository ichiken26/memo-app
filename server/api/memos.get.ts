import { decodeMemoCursor, getDb, listMemoPageByOwner } from "../utils/d1";
import { requireFirebaseUser } from "../utils/firebaseAuth";
import { beginApiTiming } from "../utils/performance";
import { MEMO_PAGE_SIZE } from "../../shared/memos";

export default defineEventHandler(async (event) => {
  const timing = beginApiTiming(event);
  try {
    const { uid: ownerUid } = await timing.measure("auth", () => requireFirebaseUser(event));
    const query = getQuery(event);
    const requested = Number(query.limit ?? MEMO_PAGE_SIZE);
    const limit = Number.isFinite(requested) ? Math.min(MEMO_PAGE_SIZE, Math.max(1, Math.trunc(requested))) : MEMO_PAGE_SIZE;
    const cursor = decodeMemoCursor(typeof query.cursor === "string" ? query.cursor : null);
    const page = await timing.measure("db", () => listMemoPageByOwner(getDb(event), { ownerUid, limit, cursor }));
    return await timing.measure("map", async () => page);
  } finally {
    timing.finish();
  }
});

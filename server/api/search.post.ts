import type { MemoTag } from "../../shared/memos";
import { decodeMemoCursor, getDb, searchMemos } from "../utils/d1";
import { requireFirebaseUser } from "../utils/firebaseAuth";

type SearchRequestBody = {
  search_word?: string;
  tags?: Pick<MemoTag, "id" | "name">[];
  cursor?: string;
  limit?: number;
};

export default defineEventHandler(async (event) => {
  const body = await readBody<SearchRequestBody>(event);
  const { uid: ownerUid } = await requireFirebaseUser(event);

  const page = await searchMemos(getDb(event), {
      searchWord: body.search_word ?? "",
      tags: body.tags ?? [],
      ownerUid,
      cursor: decodeMemoCursor(body.cursor),
      limit: Math.min(30, Math.max(1, Math.trunc(Number(body.limit) || 30))),
    });
  return { results: page.items, nextCursor: page.nextCursor, hasMore: page.hasMore };
});

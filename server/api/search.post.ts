import type { MemoTag } from "../../shared/memos";
import { getDb, searchMemos } from "../utils/d1";
import { requireFirebaseUser } from "../utils/firebaseAuth";

type SearchRequestBody = {
  search_word?: string;
  tags?: Pick<MemoTag, "id" | "name">[];
};

export default defineEventHandler(async (event) => {
  const body = await readBody<SearchRequestBody>(event);
  const { uid: ownerUid } = await requireFirebaseUser(event);

  return {
    results: await searchMemos(getDb(event), {
      searchWord: body.search_word ?? "",
      tags: body.tags ?? [],
      ownerUid,
    }),
  };
});

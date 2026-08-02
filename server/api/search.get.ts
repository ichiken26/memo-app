import { getDb, listTagsByOwner, searchMemos } from "../utils/d1";
import { requireFirebaseUser } from "../utils/firebaseAuth";

export default defineEventHandler(async (event) => {
  const { uid: ownerUid } = await requireFirebaseUser(event);
  const query = getQuery(event);
  const words = String(query.q ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const tags = await listTagsByOwner(getDb(event), ownerUid);
  const tagNames = new Set(tags.map((tag) => tag.name.toLowerCase()));
  const selectedTags = tags.filter((tag) =>
    words.some((word) => word.toLowerCase() === tag.name.toLowerCase()),
  );
  const searchWord = words
    .filter((word) => !tagNames.has(word.toLowerCase()))
    .join(" ");
  return {
    results: await searchMemos(getDb(event), {
      ownerUid,
      searchWord,
      tags: selectedTags,
    }),
  };
});

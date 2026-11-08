import { toMemoListItem, type Memo, type MemoListItem, type MemoListPage, type MemoTag } from "~~/shared/memos";

type MemoInput = { title: string; body: string; tags: MemoTag[] };
const cloneMemo = (memo: Memo): Memo => ({ ...memo, tags: memo.tags.map((tag) => ({ ...tag })) });

export const useMemoStore = () => {
  const apiFetch = useApiFetch();
  const memos = useState<MemoListItem[]>("memo-store-list", () => []);
  const listPages = useState<MemoListItem[][]>("memo-store-pages", () => []);
  const detailById = useState<Record<string, Memo>>("memo-store-details", () => ({}));
  const detailOwnerById = useState<Record<string, string>>("memo-store-detail-owners", () => ({}));
  const detailLoadingById = useState<Record<string, boolean>>("memo-store-detail-loading", () => ({}));
  const detailErrorById = useState<Record<string, string>>("memo-store-detail-errors", () => ({}));
  const tags = useState<MemoTag[]>("memo-store-tags", () => []);
  const nextCursor = useState<string | null>("memo-store-cursor", () => null);
  const hasMore = useState("memo-store-has-more", () => false);
  const isLoaded = useState("memo-store-loaded", () => false);
  const isLoading = useState("memo-store-loading", () => false);
  const loadError = useState<string | null>("memo-store-load-error", () => null);
  const loadedOwnerUid = useState<string | null>("memo-store-loaded-owner-uid", () => null);
  const pendingOwnerUid = useState<string | null>("memo-store-pending-owner-uid", () => null);
  let loadGeneration = 0;

  const rebuild = () => {
    const seen = new Set<string>();
    memos.value = listPages.value.flat().filter((memo) => !seen.has(memo.id) && Boolean(seen.add(memo.id)));
  };
  const upsertList = (item: MemoListItem) => {
    listPages.value = listPages.value.map((page) => page.filter((memo) => memo.id !== item.id));
    listPages.value[0] = [item, ...(listPages.value[0] ?? [])];
    rebuild();
  };
  const reset = () => {
    loadGeneration += 1;
    memos.value = []; listPages.value = []; detailById.value = {}; detailOwnerById.value = {}; detailLoadingById.value = {}; detailErrorById.value = {};
    tags.value = []; nextCursor.value = null; hasMore.value = false; isLoaded.value = false; loadedOwnerUid.value = null;
  };
  const findMemo = (id: string) => detailById.value[id] ?? memos.value.find((memo) => memo.id === id);
  const findMemoForOwner = (id: string, ownerUid: string) => detailOwnerById.value[id] === ownerUid ? detailById.value[id] : undefined;
  const findTag = (id: string) => tags.value.find((tag) => tag.id === id);
  const getMemosByOwner = (ownerUid: string) => loadedOwnerUid.value === ownerUid ? memos.value : [];

  const fetchPage = async (cursor: string | null) => apiFetch<MemoListPage>("/api/memos", { query: { limit: 30, ...(cursor ? { cursor } : {}) } });
  const loadForOwner = async (ownerUid: string, options: { force?: boolean } = {}) => {
    if (!options.force && isLoaded.value && loadedOwnerUid.value === ownerUid) return;
    if (pendingOwnerUid.value === ownerUid) return;
    if (loadedOwnerUid.value !== ownerUid || options.force) reset();
    const generation = loadGeneration;
    pendingOwnerUid.value = ownerUid; isLoading.value = true; loadError.value = null;
    performance.mark?.("memo-list-load-start");
    try {
      const [page, tagResponse] = await Promise.all([fetchPage(null), apiFetch<{ tags: MemoTag[] }>("/api/tags")]);
      if (generation !== loadGeneration || pendingOwnerUid.value !== ownerUid) return;
      listPages.value = [page.items]; rebuild(); tags.value = tagResponse.tags;
      nextCursor.value = page.nextCursor; hasMore.value = page.hasMore; loadedOwnerUid.value = ownerUid; isLoaded.value = true;
      performance.mark?.("memo-list-load-end");
      performance.measure?.("memo-list-load", "memo-list-load-start", "memo-list-load-end");
    } catch (error) { loadError.value = error instanceof Error ? error.message : "メモの取得に失敗しました"; }
    finally { isLoading.value = false; if (pendingOwnerUid.value === ownerUid) pendingOwnerUid.value = null; }
  };
  const loadMore = async () => {
    if (isLoading.value || !hasMore.value || !nextCursor.value) return;
    isLoading.value = true;
    const generation = loadGeneration;
    try { const page = await fetchPage(nextCursor.value); if (generation !== loadGeneration) return; listPages.value.push(page.items); rebuild(); nextCursor.value = page.nextCursor; hasMore.value = page.hasMore; }
    finally { isLoading.value = false; }
  };
  const loadDetail = async (id: string, ownerUid: string, options: { force?: boolean } = {}) => {
    if (!options.force && detailOwnerById.value[id] === ownerUid && detailById.value[id]) return detailById.value[id];
    if (detailLoadingById.value[id]) return;
    const generation = loadGeneration;
    detailLoadingById.value = { ...detailLoadingById.value, [id]: true };
    const errors = { ...detailErrorById.value }; delete errors[id]; detailErrorById.value = errors;
    try {
      const { memo } = await apiFetch<{ memo: Memo }>(`/api/memos/${encodeURIComponent(id)}`);
      if (generation !== loadGeneration) return;
      detailById.value = { ...detailById.value, [id]: cloneMemo(memo) };
      detailOwnerById.value = { ...detailOwnerById.value, [id]: ownerUid };
      return detailById.value[id];
    } catch (error) {
      if (generation === loadGeneration) {
        detailErrorById.value = { ...detailErrorById.value, [id]: error instanceof Error ? error.message : "メモの取得に失敗しました" };
      }
      throw error;
    } finally {
      if (generation === loadGeneration) detailLoadingById.value = { ...detailLoadingById.value, [id]: false };
    }
  };
  const createTag = async (name: string) => { const trimmed = name.trim(); if (!trimmed) return null; const { tag } = await apiFetch<{ tag: MemoTag }>("/api/tags", { method: "POST", body: { name: trimmed } }); tags.value = [...tags.value.filter((x) => x.id !== tag.id), tag]; return tag; };
  const updateTag = async (id: string, input: { name: string; color: string }) => { if (!input.name.trim()) return null; const { tag } = await apiFetch<{ tag: MemoTag }>(`/api/tags/${encodeURIComponent(id)}`, { method: "PATCH", body: { ...input, name: input.name.trim() } }); tags.value = tags.value.map((x) => x.id === id ? tag : x); listPages.value = listPages.value.map((page) => page.map((m) => ({ ...m, tags: m.tags.map((t) => t.id === id ? tag : t) }))); rebuild(); for (const memo of Object.values(detailById.value)) memo.tags = memo.tags.map((t) => t.id === id ? tag : t); return tag; };
  const deleteTag = async (id: string) => { await apiFetch(`/api/tags/${encodeURIComponent(id)}`, { method: "DELETE" }); tags.value = tags.value.filter((t) => t.id !== id); listPages.value = listPages.value.map((page) => page.map((m) => ({ ...m, tags: m.tags.filter((t) => t.id !== id) }))); rebuild(); for (const memo of Object.values(detailById.value)) memo.tags = memo.tags.filter((t) => t.id !== id); };
  const syncMemo = (memo: Memo) => { detailById.value = { ...detailById.value, [memo.id]: cloneMemo(memo) }; if (loadedOwnerUid.value) detailOwnerById.value = { ...detailOwnerById.value, [memo.id]: loadedOwnerUid.value }; upsertList(toMemoListItem(memo)); };
  const createMemo = async (input: MemoInput) => { const { memo } = await apiFetch<{ memo: Memo }>("/api/memos", { method: "POST", body: input }); syncMemo(memo); return cloneMemo(memo); };
  const updateMemo = async (id: string, input: MemoInput) => { const { memo } = await apiFetch<{ memo: Memo }>(`/api/memos/${encodeURIComponent(id)}`, { method: "PATCH", body: input }); syncMemo(memo); return cloneMemo(memo); };
  const deleteMemo = async (id: string) => { await apiFetch(`/api/memos/${encodeURIComponent(id)}`, { method: "DELETE" }); listPages.value = listPages.value.map((page) => page.filter((m) => m.id !== id)); rebuild(); const next = { ...detailById.value }; delete next[id]; detailById.value = next; const owners = { ...detailOwnerById.value }; delete owners[id]; detailOwnerById.value = owners; };
  return { memos, listPages, detailById, detailLoadingById, detailErrorById, tags, nextCursor, hasMore, isLoaded, isLoading, loadError, loadForOwner, loadMore, loadDetail, reset, findMemo, findMemoForOwner, findTag, getMemosByOwner, createTag, updateTag, deleteTag, createMemo, updateMemo, deleteMemo };
};

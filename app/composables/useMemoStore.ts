import { type Memo, type MemoTag } from "~~/shared/memos";

type MemoInput = {
  title: string;
  body: string;
  tags: MemoTag[];
};

const cloneMemo = (memo: Memo): Memo => ({
  ...memo,
  tags: memo.tags.map((tag) => ({ ...tag })),
});

export const useMemoStore = () => {
  const apiFetch = useApiFetch();
  const memos = useState<Memo[]>("memo-store-memos", () => []);
  const tags = useState<MemoTag[]>("memo-store-tags", () => []);
  const isLoaded = useState("memo-store-loaded", () => false);
  const isLoading = useState("memo-store-loading", () => false);
  const loadError = useState<string | null>(
    "memo-store-load-error",
    () => null,
  );
  const loadedOwnerUid = useState<string | null>(
    "memo-store-loaded-owner-uid",
    () => null,
  );
  const pendingOwnerUid = useState<string | null>(
    "memo-store-pending-owner-uid",
    () => null,
  );

  const findMemo = (id: string) => memos.value.find((memo) => memo.id === id);
  const findMemoForOwner = (id: string, ownerUid: string) =>
    memos.value.find((memo) => memo.id === id && memo.ownerUid === ownerUid);
  const findTag = (id: string) => tags.value.find((tag) => tag.id === id);
  const getMemosByOwner = (ownerUid: string) =>
    memos.value.filter((memo) => memo.ownerUid === ownerUid);

  const loadForOwner = async (
    ownerUid: string,
    options: { force?: boolean } = {},
  ) => {
    if (!options.force && isLoaded.value && loadedOwnerUid.value === ownerUid) {
      return;
    }
    if (pendingOwnerUid.value === ownerUid) {
      return;
    }

    pendingOwnerUid.value = ownerUid;
    isLoading.value = true;
    loadError.value = null;
    try {
      const [memoResponse, tagResponse] = await Promise.all([
        apiFetch<{ memos: Memo[] }>("/api/memos"),
        apiFetch<{ tags: MemoTag[] }>("/api/tags"),
      ]);

      memos.value = memoResponse.memos;
      tags.value = tagResponse.tags;
      loadedOwnerUid.value = ownerUid;
      isLoaded.value = true;
    } catch (error) {
      isLoaded.value = false;
      loadError.value =
        error instanceof Error ? error.message : "メモの取得に失敗しました";
    } finally {
      isLoading.value = false;
      if (pendingOwnerUid.value === ownerUid) {
        pendingOwnerUid.value = null;
      }
    }
  };

  const createTag = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return null;
    }

    const { tag } = await apiFetch<{ tag: MemoTag }>("/api/tags", {
      method: "POST",
      body: { name: trimmedName },
    });
    tags.value = [
      ...tags.value.filter((currentTag) => currentTag.id !== tag.id),
      tag,
    ];
    return tag;
  };

  const updateTag = async (
    id: string,
    input: { name: string; color: string },
  ) => {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return null;
    }

    const { tag } = await apiFetch<{ tag: MemoTag }>(
      `/api/tags/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: {
          name: trimmedName,
          color: input.color,
        },
      },
    );

    tags.value = tags.value.map((currentTag) =>
      currentTag.id === id ? tag : currentTag,
    );
    memos.value = memos.value.map((memo) => ({
      ...memo,
      tags: memo.tags.map((memoTag) => (memoTag.id === id ? tag : memoTag)),
    }));
    return tag;
  };

  const deleteTag = async (id: string) => {
    await apiFetch(`/api/tags/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    tags.value = tags.value.filter((tag) => tag.id !== id);
    memos.value = memos.value.map((memo) => ({
      ...memo,
      tags: memo.tags.filter((tag) => tag.id !== id),
    }));
  };

  const createMemo = async (input: MemoInput) => {
    const { memo } = await apiFetch<{ memo: Memo }>("/api/memos", {
      method: "POST",
      body: input,
    });
    memos.value = [memo, ...memos.value];
    return cloneMemo(memo);
  };

  const updateMemo = async (id: string, input: MemoInput) => {
    const { memo: updatedMemo } = await apiFetch<{ memo: Memo }>(
      `/api/memos/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: input,
      },
    );

    memos.value = memos.value.map((memo) =>
      memo.id === id ? updatedMemo : memo,
    );
    return cloneMemo(updatedMemo);
  };

  const deleteMemo = async (id: string) => {
    await apiFetch(`/api/memos/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    memos.value = memos.value.filter((memo) => memo.id !== id);
  };

  return {
    memos,
    tags,
    isLoaded,
    isLoading,
    loadError,
    loadForOwner,
    findMemo,
    findMemoForOwner,
    findTag,
    getMemosByOwner,
    createTag,
    updateTag,
    deleteTag,
    createMemo,
    updateMemo,
    deleteMemo,
  };
};

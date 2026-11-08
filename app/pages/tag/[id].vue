<script setup lang="ts">
import type { MemoListItem } from "~~/shared/memos";

const route = useRoute();
const memoStore = useMemoStore();
const { user } = useFirebaseAuth();
useLoadMemoStoreForUser(user, memoStore);

const tag = computed(() => memoStore.findTag(String(route.params.id)));
useHead(() => ({
  title: `MEMO APP | ${tag.value?.name ?? "タグ"}`,
}));
const filteredMemos = ref<MemoListItem[]>([]);
const apiFetch = useApiFetch();
const tagCursor = ref<string | null>(null);
const tagHasMore = ref(false);
const loadTagPage = async (append = false) => {
  const selectedTag = tag.value;
  if (!selectedTag || !user.value) return;
  const response = await apiFetch<{ results: MemoListItem[]; nextCursor: string | null; hasMore: boolean }>("/api/search", { method: "POST", body: { tags: [{ id: selectedTag.id, name: selectedTag.name }], ...(append && tagCursor.value ? { cursor: tagCursor.value } : {}) } });
  const combined = append ? [...filteredMemos.value, ...response.results] : response.results;
  filteredMemos.value = [...new Map(combined.map((memo) => [memo.id, memo])).values()]; tagCursor.value = response.nextCursor; tagHasMore.value = response.hasMore;
};
watch([tag, () => user.value?.uid], async ([selectedTag, ownerUid]) => {
  if (!selectedTag || !ownerUid) return;
  await loadTagPage();
}, { immediate: true });
const memoPendingDelete = ref<MemoListItem | null>(null);

const confirmMemoDelete = async () => {
  if (!user.value || !memoPendingDelete.value) {
    return;
  }

  await memoStore.deleteMemo(memoPendingDelete.value.id);
  memoPendingDelete.value = null;
};
</script>

<template>
  <main class="tag-shell">
    <header class="header">
      <TopLogoLink />
      <div>
        <p class="eyebrow">Tag</p>
        <h1>{{ tag?.name ?? "タグが見つかりません" }}</h1>
      </div>
      <div data-shortcut-help-target class="global-tools-target" />
    </header>

    <template v-if="tag">
      <MemoPreviewList
        class="memo-list"
        :memos="filteredMemos"
        @delete="(memo) => (memoPendingDelete = memo)"
      />
      <button
        v-if="tagHasMore"
        class="load-more"
        type="button"
        @click="loadTagPage(true)"
      >
        さらに読み込む
      </button>
    </template>

    <section v-else class="missing">
      指定されたタグ ID に一致するタグはありません。
    </section>

    <ConfirmDeleteModal
      :open="Boolean(memoPendingDelete)"
      title="メモを削除"
      :message="`「${memoPendingDelete?.title ?? ''}」を削除します。この操作は元に戻せません。`"
      @cancel="memoPendingDelete = null"
      @confirm="confirmMemoDelete"
    />
  </main>
</template>

<style scoped>
.tag-shell {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  padding: 28px;
}

a {
  color: inherit;
  text-decoration: none;
}

.header,
.memo-list,
.missing {
  max-width: 980px;
  margin-right: auto;
  margin-left: auto;
}

.header {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 20px;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1,
h2 {
  margin: 0;
}

h1 {
  font-size: 36px;
}

.missing {
  display: block;
  border: 1px solid #deddd6;
  border-radius: 8px;
  background: var(--panel);
  padding: 18px;
}
</style>

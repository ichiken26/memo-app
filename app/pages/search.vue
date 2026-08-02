<script setup lang="ts">
import { computed, ref } from "vue";
import { searchMemos, type Memo } from "~~/shared/memos";

const route = useRoute();
const router = useRouter();
const memoStore = useMemoStore();
const { user } = useFirebaseAuth();
useLoadMemoStoreForUser(user, memoStore);

const userMemos = computed(() =>
  user.value ? memoStore.getMemosByOwner(user.value.uid) : [],
);

const histories = ref(["認証", "タグ検索", "Nuxt", "API"]);
const searchWord = ref(String(route.query.q ?? route.query.search_word ?? ""));
const selectedTagIds = ref<string[]>(
  typeof route.query.tag === "string"
    ? route.query.tag
        .split(",")
        .map(
          (tagName) =>
            memoStore.tags.value.find((tag) => tag.name === tagName)?.id,
        )
        .filter((tagId): tagId is string => Boolean(tagId))
    : [],
);

const selectedTags = computed(() =>
  memoStore.tags.value.filter((tag) => selectedTagIds.value.includes(tag.id)),
);
const memoPendingDelete = ref<Memo | null>(null);
const directResults = ref<Memo[] | null>(null);
const apiFetch = useApiFetch();
const results = computed(
  () =>
    directResults.value ??
    searchMemos({
      searchWord: searchWord.value,
      tags: selectedTags.value.map(({ id, name }) => ({ id, name })),
      memos: userMemos.value,
      ownerUid: user.value?.uid,
    }),
);

const submitSearch = async () => {
  directResults.value = null;
  const trimmedWord = searchWord.value.trim();
  if (trimmedWord && !histories.value.includes(trimmedWord)) {
    histories.value = [trimmedWord, ...histories.value].slice(0, 5);
  }

  await router.push({
    path: "/search",
    query: {
      ...(trimmedWord || selectedTags.value.length
        ? {
            q: [
              ...trimmedWord.split(/\s+/).filter(Boolean),
              ...selectedTags.value.map((tag) => tag.name),
            ].join(" "),
          }
        : {}),
    },
  });
};

onMounted(async () => {
  const q = String(route.query.q ?? "").trim();
  if (q) {
    const response = await apiFetch<{ results: Memo[] }>("/api/search", {
      query: { q },
    });
    directResults.value = response.results;
  }
});

const applyHistory = (word: string) => {
  searchWord.value = word;
  submitSearch();
};

const confirmMemoDelete = async () => {
  if (!user.value || !memoPendingDelete.value) {
    return;
  }

  await memoStore.deleteMemo(memoPendingDelete.value.id);
  memoPendingDelete.value = null;
};
</script>

<template>
  <main class="search-shell">
    <header class="header">
      <TopLogoLink />
      <div>
        <p class="eyebrow">Search</p>
        <h1>メモ検索</h1>
      </div>
      <div data-shortcut-help-target class="global-tools-target" />
    </header>

    <SearchPanel
      class="search-panel"
      v-model:search-word="searchWord"
      v-model:selected-tag-ids="selectedTagIds"
      :histories="histories"
      :tags="memoStore.tags.value"
      @submit="submitSearch"
      @apply-history="applyHistory"
    />

    <SearchResults
      class="result-area"
      :results="results"
      @delete="(memo) => (memoPendingDelete = memo)"
    />

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
.search-shell {
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
.search-panel,
.result-area {
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
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1,
h2,
h3 {
  margin: 0;
}

h1 {
  font-size: 34px;
}

.result-area {
  margin-top: 20px;
}

@media (max-width: 680px) {
  .search-shell {
    padding: 18px;
  }

  .header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

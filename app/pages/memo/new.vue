<script setup lang="ts">
import type { MemoTag } from "~~/shared/memos";

const router = useRouter();
const memoStore = useMemoStore();
const { user } = useFirebaseAuth();
useLoadMemoStoreForUser(user, memoStore);

const createMemo = async (value: {
  title: string;
  body: string;
  tags: MemoTag[];
}) => {
  if (!user.value) {
    return;
  }

  const memo = await memoStore.createMemo(value);
  await router.push(`/memo/${encodeURIComponent(memo.id)}?mode=edit`);
};

const createAndSelectTag = async (
  name: string,
  selectTag: (tag: MemoTag) => void,
) => {
  if (user.value) {
    const tag = await memoStore.createTag(name);
    if (tag) {
      selectTag(tag);
    }
  }
};
</script>

<template>
  <main class="new-memo-shell">
    <header class="memo-header">
      <TopLogoLink />
      <div>
        <p class="eyebrow">Create</p>
        <h1>メモ作成</h1>
      </div>
      <div data-shortcut-help-target class="global-tools-target" />
    </header>

    <MemoPreview
      class="memo-editor"
      editor-mode="create"
      view-mode="edit"
      :available-tags="memoStore.tags.value"
      @save="createMemo"
      @create-tag="createAndSelectTag"
    />
  </main>
</template>

<style scoped>
.new-memo-shell {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  padding: 28px;
}

.memo-header,
.memo-editor {
  max-width: 1066px;
  margin-right: auto;
  margin-left: auto;
}

.memo-header {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 34px;
}
</style>

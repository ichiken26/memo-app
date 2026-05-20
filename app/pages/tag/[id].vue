<script setup lang="ts">
import type { Memo } from '~~/shared/memos'

const route = useRoute()
const memoStore = useMemoStore()
const { user } = useFirebaseAuth()
useLoadMemoStoreForUser(user, memoStore)

const tag = computed(() => memoStore.findTag(String(route.params.id)))
const filteredMemos = computed(() =>
  tag.value && user.value
    ? memoStore
        .getMemosByOwner(user.value.uid)
        .filter((memo) => memo.tags.some((memoTag) => memoTag.id === tag.value?.id))
    : []
)
const memoPendingDelete = ref<Memo | null>(null)

const confirmMemoDelete = async () => {
  if (!user.value || !memoPendingDelete.value) {
    return
  }

  await memoStore.deleteMemo(memoPendingDelete.value.id, user.value.uid)
  memoPendingDelete.value = null
}
</script>

<template>
  <main class="tag-shell">
    <header class="header">
      <TopLogoLink />
      <div>
        <p class="eyebrow">Tag</p>
        <h1>{{ tag?.name ?? 'タグが見つかりません' }}</h1>
      </div>
    </header>

    <MemoPreviewList v-if="tag" class="memo-list" :memos="filteredMemos" @delete="(memo) => memoPendingDelete = memo" />

    <section v-else class="missing">指定されたタグ ID に一致するタグはありません。</section>

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
  background: #f7f7f4;
  color: #1f2933;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
  color: #52616b;
  font-size: 13px;
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
  background: #ffffff;
  padding: 18px;
}
</style>

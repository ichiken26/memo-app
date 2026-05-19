<script setup lang="ts">
import type { MemoTag } from '~~/shared/memos'

const router = useRouter()
const memoStore = useMemoStore()
const { user } = useFirebaseAuth()
useLoadMemoStoreForUser(user, memoStore)

const createMemo = async (value: { title: string; body: string; tags: MemoTag[] }) => {
  if (!user.value) {
    return
  }

  const memo = await memoStore.createMemo({
    ...value,
    ownerUid: user.value.uid
  })
  router.push(`/memo/${memo.id}?tag=${encodeURIComponent(memo.tags.map((tag) => tag.name).join(','))}`)
}

const createAndSelectTag = async (name: string, selectTag: (tag: MemoTag) => void) => {
  if (user.value) {
    const tag = await memoStore.createTag(user.value.uid, name)
    if (tag) {
      selectTag(tag)
    }
  }
}
</script>

<template>
  <main class="new-memo-shell">
    <header class="memo-header">
      <TopLogoLink />
      <div>
        <p class="eyebrow">Create</p>
        <h1>メモ作成</h1>
      </div>
    </header>

    <MemoEditor
      class="memo-editor"
      mode="create"
      :available-tags="memoStore.tags.value"
      @save="createMemo"
      @create-tag="createAndSelectTag"
    />
  </main>
</template>

<style scoped>
.new-memo-shell {
  min-height: 100vh;
  background: #f7f7f4;
  color: #1f2933;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  padding: 28px;
}

.memo-header,
.memo-editor {
  max-width: 820px;
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
  color: #52616b;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 34px;
}
</style>

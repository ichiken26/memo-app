<script setup lang="ts">
import type { MemoTag } from '~~/shared/memos'

const route = useRoute()
const router = useRouter()
const memoStore = useMemoStore()
const { user } = useFirebaseAuth()
useLoadMemoStoreForUser(user, memoStore)

const memoId = computed(() => String(route.params.id))
const memo = computed(() => (user.value ? memoStore.findMemoForOwner(memoId.value, user.value.uid) : null))
const saveStatus = ref('保存済み')
const hasUnsavedChanges = ref(false)
const isSaving = ref(false)
const isDeleteModalOpen = ref(false)
let saveTimer: ReturnType<typeof setTimeout> | null = null

const saveMemo = async (value: { title: string; body: string; tags: MemoTag[] }) => {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  isSaving.value = true
  saveStatus.value = '保存中...'
  if (user.value) {
    await memoStore.updateMemo(memoId.value, {
      ...value,
      ownerUid: user.value.uid
    })
  }
  hasUnsavedChanges.value = false
  isSaving.value = false
  saveStatus.value = '保存済み'
}

const queueAutoSave = (value: { title: string; body: string; tags: MemoTag[] }) => {
  if (!memo.value) {
    return
  }

  hasUnsavedChanges.value = true
  saveStatus.value = '未保存の変更あり'
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  saveTimer = setTimeout(() => saveMemo(value), 1000)
}

const createAndSelectTag = async (name: string, selectTag: (tag: MemoTag) => void) => {
  if (user.value) {
    const tag = await memoStore.createTag(user.value.uid, name)
    if (tag) {
      selectTag(tag)
    }
  }
}

const deleteCurrentMemo = async () => {
  if (!user.value || !memo.value) {
    return
  }

  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }

  hasUnsavedChanges.value = false
  isSaving.value = false
  await memoStore.deleteMemo(memo.value.id, user.value.uid)
  isDeleteModalOpen.value = false
  await router.push('/')
}

const warnBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!hasUnsavedChanges.value && !isSaving.value) {
    return
  }

  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  window.addEventListener('beforeunload', warnBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', warnBeforeUnload)
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
})

onBeforeRouteLeave(() => {
  if (!hasUnsavedChanges.value && !isSaving.value) {
    return true
  }

  return window.confirm('保存が完了していない変更があります。ページを離れますか？')
})
</script>

<template>
  <main class="memo-shell">
    <header class="memo-header">
      <TopLogoLink />
    </header>

    <section v-if="memo" class="memo-detail">
      <div class="detail-meta">
        <span>更新日: {{ memo.updatedAt }}</span>
        <button class="ghost-button" type="button" @click="router.push('/memo/new')">新規作成</button>
      </div>
      <MemoEditor
        :key="memo.id"
        mode="edit"
        :memo="memo"
        :available-tags="memoStore.tags.value"
        :save-status="saveStatus"
        @change="queueAutoSave"
        @save="saveMemo"
        @delete="isDeleteModalOpen = true"
        @create-tag="createAndSelectTag"
      />

      <ConfirmDeleteModal
        :open="isDeleteModalOpen"
        title="メモを削除"
        :message="`「${memo.title}」を削除します。この操作は元に戻せません。`"
        @cancel="isDeleteModalOpen = false"
        @confirm="deleteCurrentMemo"
      />
    </section>

    <section v-else class="missing">
      <h1>メモが見つかりません</h1>
      <p>指定されたメモ ID に一致するメモはありません。</p>
    </section>
  </main>
</template>

<style scoped>
.memo-shell {
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

.memo-header {
  max-width: 820px;
  margin: 0 auto;
}

.missing {
  max-width: 820px;
  margin: 16px auto 0;
  border: 1px solid #d9d8d2;
  border-radius: 8px;
  background: #ffffff;
  padding: 30px;
}

.memo-detail {
  max-width: 820px;
  margin: 16px auto 0;
}

.detail-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: #6b7280;
  font-size: 13px;
  font-weight: 800;
}

.ghost-button {
  min-height: 36px;
  border: 1px solid #cfd3d8;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2933;
  cursor: pointer;
  font-weight: 800;
  padding: 0 12px;
}
</style>

<script setup lang="ts">
import type { MemoTag } from '~~/shared/memos'

const route = useRoute()
const router = useRouter()
const memoStore = useMemoStore()
const { user } = useFirebaseAuth()
useLoadMemoStoreForUser(user, memoStore)

const memoId = computed(() => String(route.params.id))
const memo = computed(() =>
  user.value ? memoStore.findMemoForOwner(memoId.value, user.value.uid) : null,
)
const saveStatus = ref('保存済み')
const hasUnsavedChanges = ref(false)
const isSaving = ref(false)
const isDeleteModalOpen = ref(false)
const viewMode = computed<'edit' | 'preview'>(() =>
  route.query.mode === 'preview' ? 'preview' : 'edit',
)
const setMode = async (mode: 'edit' | 'preview') => {
  if (import.meta.client) localStorage.setItem('memo-view-mode', mode)
  await router.replace({ query: { ...route.query, mode } })
}
let saveTimer: ReturnType<typeof setTimeout> | null = null

const saveMemo = async (value: {
  title: string
  body: string
  tags: MemoTag[]
}) => {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  isSaving.value = true
  saveStatus.value = '保存中...'
  if (user.value) {
    await memoStore.updateMemo(memoId.value, {
      ...value,
      ownerUid: user.value.uid,
    })
  }
  hasUnsavedChanges.value = false
  isSaving.value = false
  saveStatus.value = '保存済み'
}

const queueAutoSave = (value: {
  title: string
  body: string
  tags: MemoTag[]
}) => {
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

const createAndSelectTag = async (
  name: string,
  selectTag: (tag: MemoTag) => void,
) => {
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
  if (!route.query.mode)
    setMode(
      localStorage.getItem('memo-view-mode') === 'preview' ? 'preview' : 'edit',
    )
  window.addEventListener('keydown', modeShortcut)
})

const modeShortcut = (event: KeyboardEvent) => {
  if (!event.ctrlKey || !event.altKey) return
  if (event.key.toLowerCase() === 'e') {
    event.preventDefault()
    setMode('edit')
  }
  if (event.key.toLowerCase() === 'p') {
    event.preventDefault()
    setMode('preview')
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', warnBeforeUnload)
  window.removeEventListener('keydown', modeShortcut)
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
})

onBeforeRouteLeave(() => {
  if (!hasUnsavedChanges.value && !isSaving.value) {
    return true
  }

  return window.confirm(
    '保存が完了していない変更があります。ページを離れますか？',
  )
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
        <div>
          <button
            class="ghost-button"
            type="button"
            @click="setMode(viewMode === 'edit' ? 'preview' : 'edit')"
          >
            {{ viewMode === 'edit' ? '閲覧モード' : '編集モード' }}
          </button>
          <button
            class="ghost-button"
            type="button"
            @click="router.push('/memo/new')"
          >
            新規作成
          </button>
        </div>
      </div>
      <MemoPreview
        :key="memo.id"
        editor-mode="edit"
        :view-mode="viewMode"
        :owner-uid="user?.uid"
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
  background: var(--bg);
  color: var(--text);
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
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--panel);
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
  background: var(--panel);
  color: var(--text);
  cursor: pointer;
  font-weight: 800;
  padding: 0 12px;
}
</style>

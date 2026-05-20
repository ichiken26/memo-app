<script setup lang="ts">
import type { MemoTag } from '~~/shared/memos'

type TagDraft = {
  name: string
  color: string
}

const memoStore = useMemoStore()
const { user } = useFirebaseAuth()
useLoadMemoStoreForUser(user, memoStore)

const presetColors = ['#2563eb', '#059669', '#dc2626', '#7c3aed', '#ea580c', '#0891b2', '#4f46e5', '#0f766e', '#be123c']
const drafts = reactive<Record<string, TagDraft>>({})
const newTagName = ref('')
const newTagColor = ref('#2563eb')
const statusMessage = ref('')
const tagPendingDelete = ref<MemoTag | null>(null)
const tagSaveTimers = new Map<string, ReturnType<typeof setTimeout>>()

watch(
  () => memoStore.tags.value,
  (tags) => {
    for (const tag of tags) {
      drafts[tag.id] = {
        name: drafts[tag.id]?.name ?? tag.name,
        color: drafts[tag.id]?.color ?? tag.color
      }
    }
  },
  { immediate: true }
)

const sortedTags = computed(() =>
  [...memoStore.tags.value].sort((a, b) => a.name.localeCompare(b.name))
)

const saveTag = async (tagId: string) => {
  if (!user.value) {
    return
  }

  const tag = memoStore.findTag(tagId)
  const draft = drafts[tagId]
  if (!tag || !draft || !draft.name.trim() || (draft.name === tag.name && draft.color === tag.color)) {
    return
  }

  const updatedTag = await memoStore.updateTag(tagId, user.value.uid, draft)
  if (!updatedTag) {
    return
  }

  drafts[tagId] = {
    name: updatedTag.name,
    color: updatedTag.color
  }
  statusMessage.value = `${updatedTag.name} を更新しました`
}

const queueTagSave = (tagId: string) => {
  const timer = tagSaveTimers.get(tagId)
  if (timer) {
    clearTimeout(timer)
  }

  tagSaveTimers.set(
    tagId,
    setTimeout(() => {
      tagSaveTimers.delete(tagId)
      saveTag(tagId)
    }, 900)
  )
}

const confirmTagDelete = async () => {
  if (!user.value || !tagPendingDelete.value) {
    return
  }

  const tag = tagPendingDelete.value
  await memoStore.deleteTag(tag.id, user.value.uid)
  delete drafts[tag.id]
  tagPendingDelete.value = null
  statusMessage.value = `${tag.name} を削除しました`
}

const createTag = async () => {
  if (!user.value) {
    return
  }

  const createdTag = await memoStore.createTag(user.value.uid, newTagName.value)
  if (!createdTag) {
    return
  }

  const finalTag =
    createdTag.color === newTagColor.value
      ? createdTag
      : await memoStore.updateTag(createdTag.id, user.value.uid, {
          name: createdTag.name,
          color: newTagColor.value
        })

  if (finalTag) {
    drafts[finalTag.id] = {
      name: finalTag.name,
      color: finalTag.color
    }
    statusMessage.value = `${finalTag.name} を追加しました`
  }

  newTagName.value = ''
  newTagColor.value = '#2563eb'
}

watch(
  drafts,
  () => {
    for (const tag of memoStore.tags.value) {
      const draft = drafts[tag.id]
      if (draft && (draft.name !== tag.name || draft.color !== tag.color)) {
        queueTagSave(tag.id)
      }
    }
  },
  { deep: true }
)

onBeforeUnmount(() => {
  for (const timer of tagSaveTimers.values()) {
    clearTimeout(timer)
  }
})
</script>

<template>
  <main class="tags-shell">
    <header class="tags-header">
      <TopLogoLink />
      <div>
        <p class="eyebrow">Tags</p>
        <h1>タグ一覧</h1>
      </div>
      <NuxtLink class="back-link" to="/">メモ一覧</NuxtLink>
    </header>

    <section class="create-panel" aria-label="タグの新規追加">
      <form class="create-form" @submit.prevent="createTag">
        <input v-model="newTagName" type="text" placeholder="新しいタグ名" aria-label="新しいタグ名">
        <div class="color-tools">
          <div class="preset-colors" aria-label="新しいタグのプリセット色">
            <button
              v-for="color in presetColors"
              :key="`new-${color}`"
              class="preset-button"
              :class="{ selected: newTagColor === color }"
              type="button"
              :aria-label="`${color} を選択`"
              :style="{ backgroundColor: color }"
              @click="newTagColor = color"
            />
          </div>
          <label class="color-field">
            <span :style="{ backgroundColor: newTagColor }" />
            <input v-model="newTagColor" type="color" aria-label="新しいタグの色を自由に選択">
          </label>
        </div>
        <button class="save-button" type="submit" :disabled="!newTagName.trim()">保存</button>
      </form>
    </section>

    <p v-if="statusMessage" class="status-message">{{ statusMessage }}</p>

    <section class="tag-list" aria-label="タグ編集">
      <article v-for="tag in sortedTags" :key="tag.id" class="tag-row">
        <div class="tag-preview">
          <span class="tag-dot" :style="{ backgroundColor: drafts[tag.id]?.color ?? tag.color }" />
          <span>{{ drafts[tag.id]?.name || tag.name }}</span>
        </div>

        <input v-model="drafts[tag.id].name" class="name-input" type="text" aria-label="タグ名">

        <div class="color-tools">
          <div class="preset-colors" aria-label="タグのプリセット色">
            <button
              v-for="color in presetColors"
              :key="`${tag.id}-${color}`"
              class="preset-button"
              :class="{ selected: drafts[tag.id]?.color === color }"
              type="button"
              :aria-label="`${color} を選択`"
              :style="{ backgroundColor: color }"
              @click="drafts[tag.id].color = color"
            />
          </div>
          <label class="color-field">
            <span :style="{ backgroundColor: drafts[tag.id]?.color ?? tag.color }" />
            <input v-model="drafts[tag.id].color" type="color" aria-label="タグの色を自由に選択">
          </label>
        </div>

        <div class="row-actions">
          <button class="delete-button" type="button" @click="tagPendingDelete = tag">削除</button>
        </div>
      </article>

      <div v-if="sortedTags.length === 0" class="empty">タグはまだありません。</div>
    </section>

    <ConfirmDeleteModal
      :open="Boolean(tagPendingDelete)"
      title="タグを削除"
      :message="`「${tagPendingDelete?.name ?? ''}」を削除します。関連メモからもこのタグが外れます。`"
      @cancel="tagPendingDelete = null"
      @confirm="confirmTagDelete"
    />
  </main>
</template>

<style scoped>
.tags-shell {
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

.tags-header,
.create-panel,
.status-message,
.tag-list {
  max-width: 920px;
  margin-right: auto;
  margin-left: auto;
}

.tags-header {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 18px;
}

.tags-header div {
  flex: 1;
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

.back-link,
.save-button,
.delete-button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;
  padding: 0 16px;
}

.back-link {
  background: #1f2933;
}

.save-button {
  background: #2563eb;
}

.save-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.delete-button {
  background: #dc2626;
}

.create-panel,
.tag-row,
.empty {
  border: 1px solid #d9d8d2;
  border-radius: 8px;
  background: #ffffff;
}

.create-panel {
  padding: 16px;
}

.create-form,
.tag-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(260px, 1.1fr) auto;
  gap: 12px;
  align-items: center;
}

.create-form input[type="text"],
.name-input {
  min-width: 0;
  min-height: 40px;
  border: 1px solid #cfd3d8;
  border-radius: 8px;
  color: #1f2933;
  font: inherit;
  padding: 0 12px;
}

.color-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preset-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-button {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  min-height: 0;
  border: 2px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px #cfd3d8;
  cursor: pointer;
  padding: 0;
}

.preset-button.selected {
  box-shadow: 0 0 0 2px #1f2933;
}

.color-field {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 0 1px #cfd3d8;
  cursor: pointer;
}

.color-field span,
.tag-dot {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

.color-field input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.status-message {
  margin-top: 12px;
  color: #52616b;
  font-size: 13px;
  font-weight: 800;
}

.tag-list {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.tag-row {
  grid-template-columns: minmax(150px, 0.8fr) minmax(180px, 1fr) minmax(260px, 1.1fr) auto;
  padding: 14px;
}

.tag-preview {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  font-weight: 800;
}

.tag-preview span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  gap: 8px;
}

.empty {
  padding: 24px;
  color: #52616b;
  text-align: center;
}

@media (max-width: 760px) {
  .tags-shell {
    padding: 20px;
  }

  .tags-header,
  .create-form,
  .tag-row {
    align-items: stretch;
    grid-template-columns: 1fr;
  }

  .tags-header {
    display: grid;
  }

  .color-field {
    width: 28px;
  }

  .color-tools {
    align-items: stretch;
    flex-direction: column;
  }

  .row-actions {
    width: 100%;
  }

  .save-button,
  .delete-button {
    flex: 1;
  }
}
</style>

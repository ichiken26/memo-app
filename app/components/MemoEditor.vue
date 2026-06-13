<script setup lang="ts">
import type { Memo, MemoTag } from '~~/shared/memos'

const props = defineProps<{
  memo?: Memo | null
  availableTags: MemoTag[]
  mode: 'create' | 'edit'
  saveStatus?: string
}>()

const emit = defineEmits<{
  (event: 'save', value: { title: string; body: string; tags: MemoTag[] }): void
  (event: 'change', value: { title: string; body: string; tags: MemoTag[] }): void
  (event: 'createTag', name: string, selectTag: (tag: MemoTag) => void): void
  (event: 'delete'): void
}>()

const title = ref(props.memo?.title ?? '')
const body = ref(props.memo?.body ?? '')
const selectedTags = ref<MemoTag[]>(props.memo?.tags.map((tag) => ({ ...tag })) ?? [])

watch(
  () => props.memo?.id,
  () => {
    title.value = props.memo?.title ?? ''
    body.value = props.memo?.body ?? ''
    selectedTags.value = props.memo?.tags.map((tag) => ({ ...tag })) ?? []
  }
)

const editorValue = computed(() => ({
  title: title.value,
  body: body.value,
  tags: selectedTags.value
}))

watch(editorValue, (value) => emit('change', value), { deep: true })

const save = () => emit('save', editorValue.value)
</script>

<template>
  <form class="memo-editor" @submit.prevent="save">
    <input
      v-model="title"
      class="title-input"
      type="text"
      placeholder="タイトル"
      aria-label="メモタイトル"
      @keydown.ctrl.enter.prevent="save"
      @keydown.meta.enter.prevent="save"
    >

    <TagPicker
      v-model="selectedTags"
      :available-tags="availableTags"
      @create-tag="(name, selectTag) => emit('createTag', name, selectTag)"
    />

    <textarea
      v-model="body"
      class="body-input"
      placeholder="メモを入力"
      aria-label="メモ本文"
      @keydown.ctrl.enter.prevent="save"
      @keydown.meta.enter.prevent="save"
    />

    <footer class="editor-footer">
      <span v-if="mode === 'edit'" class="save-status">{{ saveStatus }}</span>
      <span v-else class="save-status">作成時に保存されます</span>
      <div class="editor-actions">
        <button class="save-button" type="submit">保存</button>
        <button v-if="mode === 'edit'" class="delete-button" type="button" @click="emit('delete')">削除</button>
      </div>
    </footer>
  </form>
</template>

<style scoped>
.memo-editor {
  display: grid;
  border: 1px solid #d9d8d2;
  border-radius: 8px;
  background: #ffffff;
  padding: 22px;
  gap: 16px;
}

.title-input,
.body-input {
  width: 100%;
  border: 0;
  color: #1f2933;
  font-family: inherit;
  outline: none;
}

.title-input {
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 800;
  line-height: 1.15;
}

.body-input {
  min-height: 280px;
  resize: vertical;
  font-size: 18px;
  line-height: 1.8;
}

.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #ecebe5;
  padding-top: 14px;
}

.save-status {
  color: #52616b;
  font-size: 13px;
  font-weight: 800;
}

.editor-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.save-button,
.delete-button {
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;
  padding: 0 18px;
}

.save-button {
  background: #2563eb;
}

.delete-button {
  background: #dc2626;
}

@media (max-width: 560px) {
  .editor-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .editor-actions {
    width: 100%;
  }

  .save-button,
  .delete-button {
    flex: 1;
  }
}
</style>

<script setup lang="ts">
import { nextTick } from 'vue'
import type { MemoTag } from '~~/shared/memos'

const props = defineProps<{
  modelValue: MemoTag[]
  availableTags: MemoTag[]
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: MemoTag[]): void
  (event: 'createTag', name: string, selectTag: (tag: MemoTag) => void): void
}>()

const isOpen = ref(false)
const newTagName = ref('')

const selectedIds = computed(() => props.modelValue.map((tag) => tag.id))

const toggleTag = (tag: MemoTag) => {
  if (selectedIds.value.includes(tag.id)) {
    emit(
      'update:modelValue',
      props.modelValue.filter((selectedTag) => selectedTag.id !== tag.id)
    )
    return
  }

  emit('update:modelValue', [...props.modelValue, tag])
}

const removeTag = (tag: MemoTag) => {
  emit(
    'update:modelValue',
    props.modelValue.filter((selectedTag) => selectedTag.id !== tag.id)
  )
}

const createTag = async () => {
  const name = newTagName.value.trim()
  if (!name) {
    return
  }

  emit('createTag', name, (createdTag) => {
    if (!selectedIds.value.includes(createdTag.id)) {
      emit('update:modelValue', [...props.modelValue, createdTag])
    }
  })
  newTagName.value = ''
  isOpen.value = true
  await nextTick()
}
</script>

<template>
  <section class="tag-picker">
    <div class="selected-row">
      <TagChip
        v-for="tag in modelValue"
        :key="tag.id"
        :tag="tag"
        removable
        :as-link="false"
        @remove="removeTag"
      />
      <button class="add-button" type="button" :aria-expanded="isOpen" @click="isOpen = !isOpen">
        +
      </button>
    </div>

    <div v-if="isOpen" class="picker-panel">
      <div class="tag-options">
        <button
          v-for="tag in availableTags"
          :key="tag.id"
          class="tag-option"
          :class="{ selected: selectedIds.includes(tag.id) }"
          type="button"
          @click="toggleTag(tag)"
        >
          <span class="tag-dot" :style="{ backgroundColor: tag.color }" />
          <span>{{ tag.name }}</span>
        </button>
      </div>

      <form class="new-tag-form" @submit.prevent="createTag">
        <input v-model="newTagName" type="text" placeholder="新しいタグ名">
        <button type="submit">追加</button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.tag-picker {
  display: grid;
  gap: 10px;
}

.selected-row,
.tag-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.add-button {
  width: 32px;
  height: 32px;
  border: 1px solid #cfd3d8;
  border-radius: 50%;
  background: #1f2933;
  color: #ffffff;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
}

.picker-panel {
  display: grid;
  border: 1px solid #d9d8d2;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
  gap: 12px;
}

.tag-option {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 7px;
  border: 1px solid #d9d8d2;
  border-radius: 999px;
  padding: 0 12px;
  background: #f7f7f4;
  color: #52616b;
  cursor: pointer;
  font-weight: 800;
}

.tag-option.selected {
  border-color: #1f2933;
  background: #e8edf2;
  color: #1f2933;
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.new-tag-form {
  display: flex;
  gap: 8px;
}

.new-tag-form input {
  min-width: 0;
  flex: 1;
  border: 1px solid #cfd3d8;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 15px;
}

.new-tag-form button {
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  background: #1f2933;
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;
  padding: 0 14px;
}
</style>

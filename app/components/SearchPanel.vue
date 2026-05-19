<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { MemoTag } from '~~/shared/memos'

const props = defineProps<{
  searchWord: string
  selectedTagIds: string[]
  histories: string[]
  tags: MemoTag[]
}>()

const emit = defineEmits<{
  (event: 'update:searchWord', value: string): void
  (event: 'update:selectedTagIds', value: string[]): void
  (event: 'submit'): void
  (event: 'applyHistory', value: string): void
}>()

const searchBox = ref<HTMLElement | null>(null)
const isShowedHistory = ref(false)

const searchWordModel = computed({
  get: () => props.searchWord,
  set: (value: string) => emit('update:searchWord', value)
})

const selectedTagIdsModel = computed({
  get: () => props.selectedTagIds,
  set: (value: string[]) => emit('update:selectedTagIds', value)
})

const submit = () => {
  isShowedHistory.value = false
  emit('submit')
}

const applyHistory = (word: string) => {
  searchWordModel.value = word
  isShowedHistory.value = false
  emit('applyHistory', word)
}

const closeHistoryOnOutsideClick = (event: MouseEvent) => {
  if (!searchBox.value?.contains(event.target as Node)) {
    isShowedHistory.value = false
  }
}

const closeHistoryOnEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    isShowedHistory.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', closeHistoryOnOutsideClick)
  document.addEventListener('keydown', closeHistoryOnEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', closeHistoryOnOutsideClick)
  document.removeEventListener('keydown', closeHistoryOnEscape)
})
</script>

<template>
  <form class="search-panel" @submit.prevent="submit">
    <label class="field-label" for="search-word">検索ワード</label>
    <div ref="searchBox" class="search-box">
      <input
        id="search-word"
        v-model="searchWordModel"
        name="search-word"
        autocomplete="off"
        placeholder="タイトルまたは本文を検索"
        type="search"
        @focus="isShowedHistory = true"
      >
      <div v-if="isShowedHistory" class="history-popover">
        <button v-for="history in histories" :key="history" type="button" @mousedown.prevent="applyHistory(history)">
          {{ history }}
        </button>
      </div>
    </div>

    <fieldset class="tag-filter">
      <legend>タグ</legend>
      <label v-for="tag in tags" :key="tag.id" class="tag-option">
        <input v-model="selectedTagIdsModel" type="checkbox" :value="tag.id">
        <span>{{ tag.name }}</span>
      </label>
    </fieldset>

    <button class="submit-button" type="submit">検索を実行</button>
  </form>
</template>

<style scoped>
.search-panel {
  display: grid;
  border: 1px solid #d9d8d2;
  border-radius: 8px;
  background: #ffffff;
  padding: 22px;
  gap: 16px;
}

.field-label,
legend {
  color: #374151;
  font-size: 14px;
  font-weight: 800;
}

.search-box {
  position: relative;
}

input[type='search'] {
  width: 100%;
  min-height: 48px;
  border: 1px solid #cfd3d8;
  border-radius: 8px;
  padding: 0 14px;
  color: #1f2933;
  font-size: 16px;
}

.history-popover {
  position: absolute;
  z-index: 5;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  display: grid;
  overflow: hidden;
  border: 1px solid #d9d8d2;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 30px rgba(31, 41, 51, 0.12);
}

.history-popover button {
  border: 0;
  padding: 12px 14px;
  background: #ffffff;
  color: #1f2933;
  text-align: left;
  cursor: pointer;
}

.history-popover button:hover {
  background: #f0f4f8;
}

.tag-filter {
  display: flex;
  flex-wrap: wrap;
  border: 0;
  margin: 0;
  padding: 0;
  gap: 10px;
}

.tag-filter legend {
  width: 100%;
  margin-bottom: 2px;
}

.tag-option {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  gap: 8px;
  border: 1px solid #d9d8d2;
  border-radius: 999px;
  padding: 0 12px;
  cursor: pointer;
}

.submit-button {
  min-height: 42px;
  border: 0;
  border-radius: 8px;
  background: #1f2933;
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;
}

</style>

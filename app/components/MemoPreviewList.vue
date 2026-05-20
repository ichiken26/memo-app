<script setup lang="ts">
import type { Memo } from '~~/shared/memos'

const router = useRouter()

defineProps<{
  memos: Memo[]
}>()

const emit = defineEmits<{
  (event: 'delete', memo: Memo): void
}>()

const buildMemoDetailPath = (memo: Memo) => `/memo/${memo.id}`

const openMemoDetail = async (memo: Memo) => {
  await router.push(buildMemoDetailPath(memo))
}

const deleteMemo = (memo: Memo) => {
  emit('delete', memo)
}
</script>

<template>
  <div class="memo-preview-list">
    <article
      v-for="memo in memos"
      :key="memo.id"
      class="memo-preview-card"
      role="link"
      tabindex="0"
      :aria-label="`${memo.title} を開く`"
      @click="openMemoDetail(memo)"
      @keydown.enter.prevent="openMemoDetail(memo)"
      @keydown.space.prevent="openMemoDetail(memo)"
    >
      <span class="date">{{ memo.updatedAt }}</span>
      <h3 class="memo-title">{{ memo.title }}</h3>
      <p>{{ memo.body }}</p>
      <div class="tag-row">
        <TagChip
          v-for="tag in memo.tags"
          :key="tag.id"
          :tag="tag"
        />
      </div>
      <button
        class="delete-button"
        type="button"
        :aria-label="`${memo.title} を削除`"
        @click.stop="deleteMemo(memo)"
        @keydown.enter.stop
        @keydown.space.stop
      >
        <TrashIcon />
      </button>
    </article>
  </div>
</template>

<style scoped>
.memo-preview-list {
  container-type: inline-size;
  display: grid;
  gap: 10px;
}

.memo-preview-card {
  position: relative;
  display: grid;
  max-height: 61.8cqw;
  overflow: hidden;
  border: 1px solid #deddd6;
  border-radius: 8px;
  background: #ffffff;
  padding: 18px 42px 18px 18px;
  cursor: pointer;
  gap: 8px;
}

.memo-preview-card:focus-within,
.memo-preview-card:focus,
.memo-preview-card:hover {
  border-color: #1f2933;
}

.memo-preview-card::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 42px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), #ffffff 70%);
  content: "";
  pointer-events: none;
}

.memo-title {
  margin: 0;
}

.memo-preview-card:hover .memo-title,
.memo-preview-card:focus .memo-title,
.memo-preview-card:focus-within .memo-title {
  text-decoration: underline;
}

.memo-preview-card p {
  min-height: 0;
  margin: 0;
  color: #52616b;
  line-height: 1.7;
  overflow: hidden;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.date {
  color: #6b7280;
  font-size: 13px;
  font-weight: 800;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 32px;
  overflow: hidden;
  padding-bottom: 2px;
  position: relative;
  z-index: 1;
}

.delete-button {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 2;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(82, 97, 107, 0.42);
  cursor: pointer;
  opacity: 0.65;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease, opacity 0.16s ease;
}

.memo-preview-card:hover .delete-button,
.memo-preview-card:focus-within .delete-button,
.delete-button:focus {
  border-color: #fecaca;
  background: #fef2f2;
  color: #dc2626;
  opacity: 1;
}

.delete-button:hover {
  border-color: #dc2626;
  background: #dc2626;
  color: #ffffff;
}

</style>

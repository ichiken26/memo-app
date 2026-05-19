<script setup lang="ts">
import type { Memo } from '~~/shared/memos'

const router = useRouter()

defineProps<{
  memos: Memo[]
}>()

const buildMemoDetailPath = (memo: Memo) => `/memo/${memo.id}`

const openMemoDetail = async (memo: Memo) => {
  await router.push(buildMemoDetailPath(memo))
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
    </article>
  </div>
</template>

<style scoped>
.memo-preview-list {
  display: grid;
  gap: 10px;
}

.memo-preview-card {
  display: block;
  border: 1px solid #deddd6;
  border-radius: 8px;
  background: #ffffff;
  padding: 18px;
  cursor: pointer;
}

.memo-preview-card:focus-within,
.memo-preview-card:focus,
.memo-preview-card:hover {
  border-color: #1f2933;
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
  margin: 8px 0 0;
  color: #52616b;
  line-height: 1.7;
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
  margin-top: 12px;
}

</style>

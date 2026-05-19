<script setup lang="ts">
import type { Memo } from '~~/shared/memos'

defineProps<{
  results: Memo[]
}>()
</script>

<template>
  <section class="result-area" aria-live="polite">
    <div class="result-head">
      <h2>検索結果</h2>
      <span>{{ results.length }}件</span>
    </div>

    <div v-if="results.length === 0" class="empty">該当するメモは存在しません</div>

    <MemoPreviewList v-else :memos="results" />
  </section>
</template>

<style scoped>
.result-area {
  margin-top: 20px;
}

.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.result-head span {
  color: #52616b;
  font-weight: 800;
}

.empty {
  border: 1px dashed #c6c9ce;
  border-radius: 8px;
  background: #ffffff;
  padding: 28px;
  color: #52616b;
  text-align: center;
}

</style>

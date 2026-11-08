<script setup lang="ts">
import { parseMemo, type MemoBlock } from "~~/shared/markdown";
import type { MemoListItem } from "~~/shared/memos";

const router = useRouter();

const props = defineProps<{
  memos: MemoListItem[];
}>();

// 抜粋は上限付きなので、カードごとに Markdown をパースしても負荷は小さい
const blocksById = computed(() => {
  const map = new Map<string, MemoBlock[]>();
  for (const memo of props.memos) map.set(memo.id, parseMemo(memo.excerpt));
  return map;
});

const emit = defineEmits<{
  (event: "delete", memo: MemoListItem): void;
}>();

const buildMemoDetailPath = (memo: MemoListItem) => `/memo/${memo.id}`;

const openMemoDetail = async (memo: MemoListItem) => {
  await router.push(buildMemoDetailPath(memo));
};

const deleteMemo = (memo: MemoListItem) => {
  emit("delete", memo);
};
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
      <!-- カード全体がリンクなので、抜粋内のリンクやチェックボックスは操作不可にする -->
      <div class="excerpt" inert>
        <template v-for="(block, i) in blocksById.get(memo.id)" :key="i">
          <div
            v-if="block.type === 'html'"
            class="html"
            v-html="block.content"
          />
          <img
            v-else-if="block.type === 'image'"
            class="excerpt-image"
            :src="block.url"
            :alt="block.alt"
            loading="lazy"
          />
          <p v-else-if="block.type === 'link'" class="excerpt-media">
            🔗 {{ block.title || block.url }}
          </p>
          <p v-else class="excerpt-media">📊 Mermaid 図</p>
        </template>
      </div>
      <div class="tag-row">
        <TagChip v-for="tag in memo.tags" :key="tag.id" :tag="tag" />
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
  background: var(--panel);
  padding: 18px 42px 18px 18px;
  cursor: pointer;
  gap: 8px;
}

.memo-preview-card:focus-within,
.memo-preview-card:focus,
.memo-preview-card:hover {
  border-color: var(--text);
}

.memo-preview-card::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 42px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), var(--panel) 70%);
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

.excerpt {
  min-height: 0;
  overflow: hidden;
  color: var(--muted);
  line-height: 1.7;
  overflow-wrap: anywhere;
  pointer-events: none;
}

.excerpt :deep(p),
.excerpt :deep(ul),
.excerpt :deep(ol),
.excerpt :deep(pre),
.excerpt :deep(blockquote),
.excerpt :deep(table) {
  margin: 0 0 0.4em;
}

.excerpt :deep(h1),
.excerpt :deep(h2),
.excerpt :deep(h3),
.excerpt :deep(h4),
.excerpt :deep(h5),
.excerpt :deep(h6) {
  margin: 0 0 0.3em;
  color: var(--text);
  font-size: 1em;
  font-weight: 800;
}

.excerpt :deep(strong) {
  color: var(--text);
  font-weight: 900;
}

.excerpt :deep(.memo-red) {
  color: var(--memo-red);
}

.excerpt :deep(.memo-strike) {
  text-decoration: line-through;
  opacity: 0.72;
}

.excerpt :deep(a) {
  color: var(--primary);
}

.excerpt :deep(code) {
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--panel-soft);
}

.excerpt :deep(pre) {
  overflow: hidden;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--panel-soft);
}

.excerpt :deep(pre code) {
  padding: 0;
  background: none;
}

.excerpt :deep(blockquote) {
  padding-left: 10px;
  border-left: 3px solid var(--border);
}

.excerpt :deep(ul:not(.contains-task-list)) {
  padding-left: 22px;
  list-style: disc outside;
}

.excerpt :deep(ol) {
  padding-left: 24px;
  list-style: decimal outside;
}

.excerpt :deep(.contains-task-list) {
  padding-left: 0;
  list-style: none;
}

.excerpt :deep(.task-list-item-checkbox) {
  margin: 0 6px 0 0;
  vertical-align: -2px;
}

.excerpt :deep(th),
.excerpt :deep(td) {
  border: 1px solid var(--border);
  padding: 2px 6px;
}

.excerpt-image {
  display: block;
  max-width: 100%;
  max-height: 120px;
  margin: 4px 0;
  border-radius: 6px;
}

.excerpt-media {
  margin: 0 0 0.4em;
}

.date {
  color: #6b7280;
  font-size: 14px;
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
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease,
    opacity 0.16s ease;
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
  color: var(--panel);
}
</style>

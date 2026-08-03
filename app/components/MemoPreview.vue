<script setup lang="ts">
import {
  findMediaSpacingWarnings,
  parseMemo,
  setTaskCheckboxAt,
  toggleStrikeListAt,
} from "~~/shared/markdown";
import type { Memo, MemoTag } from "~~/shared/memos";
const props = defineProps<{
  memo?: Memo | null;
  availableTags: MemoTag[];
  editorMode: "create" | "edit";
  saveStatus?: string;
  viewMode?: "edit" | "preview";
  headerActions?: boolean;
}>();
const emit = defineEmits<{
  (e: "save", v: { title: string; body: string; tags: MemoTag[] }): void;
  (e: "change", v: { title: string; body: string; tags: MemoTag[] }): void;
  (e: "delete"): void;
  (e: "createTag", name: string, select: (tag: MemoTag) => void): void;
}>();
const title = ref(props.memo?.title || ""),
  body = ref(props.memo?.body || ""),
  tags = ref<MemoTag[]>(props.memo?.tags.map((t) => ({ ...t })) || []);
watch(
  () => props.memo?.id,
  () => {
    title.value = props.memo?.title || "";
    body.value = props.memo?.body || "";
    tags.value = props.memo?.tags.map((t) => ({ ...t })) || [];
  },
);
const value = computed(() => ({
  title: title.value,
  body: body.value,
  tags: tags.value,
}));
watch(value, (v) => emit("change", v), { deep: true });
const blocks = computed(() => parseMemo(body.value)),
  warnings = computed(() => findMediaSpacingWarnings(body.value));

const onPreviewCheckboxChange = (event: Event) => {
  const target = event.target;
  if (
    !(target instanceof HTMLInputElement) ||
    target.type !== "checkbox" ||
    !target.classList.contains("task-list-item-checkbox")
  ) {
    return;
  }

  const preview = event.currentTarget;
  if (!(preview instanceof HTMLElement)) {
    return;
  }

  const checkboxes = [
    ...preview.querySelectorAll<HTMLInputElement>(".task-list-item-checkbox"),
  ];
  const index = checkboxes.indexOf(target);
  if (index < 0) {
    return;
  }

  body.value = setTaskCheckboxAt(body.value, index, target.checked);
};

const onPreviewClick = (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  if (target.closest(".task-list-item-checkbox")) {
    return;
  }

  const listText = target.closest<HTMLElement>(".memo-list-text");
  if (!listText) {
    return;
  }

  const preview = event.currentTarget;
  if (!(preview instanceof HTMLElement)) {
    return;
  }

  // data-list-index は html ブロックごとに 0 起点のため、プレビュー全体の DOM 順を使う
  const listTexts = [
    ...preview.querySelectorAll<HTMLElement>(".memo-list-text"),
  ];
  const index = listTexts.indexOf(listText);
  if (index < 0) {
    return;
  }

  event.preventDefault();
  body.value = toggleStrikeListAt(body.value, index);
};
</script>
<template>
  <section class="memo-workspace">
    <MemoEditorHeader
      v-model:title="title"
      v-model:tags="tags"
      :available-tags="availableTags"
      :mode="editorMode"
      :save-status="saveStatus"
      :show-actions="headerActions !== false"
      @save="emit('save', value)"
      @delete="emit('delete')"
      @create-tag="(n, s) => emit('createTag', n, s)"
    />
    <div v-if="warnings.length" class="warning">
      <AppTooltip icon="!" label="！前行と後行を空白行にしてください">
        ！前行と後行を空白行にしてください（{{ warnings.join(", ") }}行）
      </AppTooltip>
      <span>メディア記法の前後に空白行が必要です</span>
    </div>
    <div class="split" :class="{ previewOnly: viewMode === 'preview' }">
      <MemoEditor
        v-if="viewMode !== 'preview'"
        v-model="body"
        @save="emit('save', value)"
      />
      <article
        class="preview"
        aria-label="メモプレビュー"
        @change="onPreviewCheckboxChange"
        @click="onPreviewClick"
      >
        <template v-if="blocks.length">
          <template v-for="(block, i) in blocks" :key="i">
            <div
              v-if="block.type === 'html'"
              class="html"
              v-html="block.content"
            />
            <img
              v-else-if="block.type === 'image'"
              class="memo-image"
              :src="block.url"
              :alt="block.alt"
              loading="lazy"
            />
            <ClientOnly v-else-if="block.type === 'mermaid'">
              <MermaidDiagram :source="block.content" />
              <template #fallback>
                <pre>{{ block.content }}</pre>
              </template>
            </ClientOnly>
            <HyperLink v-else :title="block.title" :url="block.url" />
          </template>
        </template>
        <p v-else class="empty">プレビューがここに表示されます。</p>
      </article>
    </div>
  </section>
</template>
<style scoped>
.memo-workspace {
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--panel);
  box-shadow: var(--shadow);
}

.html :deep(strong) {
  color: var(--text);
  font-weight: 900;
}

.html :deep(strong .memo-red),
.html :deep(.memo-red strong) {
  color: var(--memo-red);
  font-weight: 900;
}

.html :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.html :deep(th),
.html :deep(td) {
  border: 1px solid var(--border);
  padding: 8px 10px;
}

.html :deep(ul:not(.contains-task-list)) {
  padding-left: 28px;
  list-style: disc outside;
}

.html :deep(ul:not(.contains-task-list) ul:not(.contains-task-list)) {
  list-style-type: circle;
}

.html :deep(ol) {
  padding-left: 32px;
  list-style: decimal outside;
}

.html :deep(.contains-task-list) {
  padding-left: 28px;
  list-style: none;
}

.html :deep(.contains-task-list > li:not(.task-list-item)) {
  list-style: disc outside;
}

.html :deep(.task-list-item) {
  list-style: none;
}

.html :deep(.contains-task-list > .task-list-item) {
  margin-left: -28px;
  padding-left: 28px;
}

.html :deep(.task-list-item .contains-task-list) {
  padding-left: 28px;
}

.html :deep(.task-list-item-checkbox) {
  appearance: none;
  width: 20px;
  height: 20px;
  margin: 0 9px 0 0;
  border: 1.5px solid #c5cad3;
  border-radius: 3px;
  background-color: #ffffff;
  vertical-align: -3px;
  opacity: 1;
  cursor: pointer;
}

.html :deep(.memo-list-text) {
  cursor: pointer;
}

.html :deep(.memo-strike) {
  text-decoration: line-through;
  opacity: 0.72;
}

.html :deep(.task-list-item-checkbox:checked) {
  border-color: #4b6cb7;
  background-color: #4b6cb7;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2.2' d='m3.5 8.2 3 3 6-6.5'/%3E%3C/svg%3E");
  background-position: center;
  background-repeat: no-repeat;
  background-size: 18px 18px;
}
.split {
  display: grid;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  grid-template-columns: 1fr 1fr;
}
.split.previewOnly {
  grid-template-columns: 1fr;
}
.preview {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 22px;
  border-left: 1px solid var(--border);
  line-height: 1.8;
}
.previewOnly .preview {
  border-left: 0;
}
.html:deep(p) {
  margin: 0 0 1em;
}
.html:deep(a) {
  color: var(--primary);
}
.html:deep(code) {
  padding: 2px 5px;
  border-radius: 5px;
  background: var(--panel-soft);
}
.memo-image {
  display: block;
  max-width: 100%;
  max-height: 70vh;
  margin: 18px auto;
  border-radius: 10px;
}
.empty {
  color: var(--muted);
}
.warning {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 9px 18px;
  background: #fff7ed;
  color: #9a3412;
  font-size: 14px;
}
@media (max-width: 850px) {
  .split {
    grid-template-columns: 1fr;
  }

  .split:not(.previewOnly) .preview {
    display: none;
  }

  .previewOnly .preview {
    border-top: 0;
    border-left: 0;
  }
}
</style>

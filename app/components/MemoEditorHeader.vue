<script setup lang="ts">
import type { MemoTag } from "~~/shared/memos";
defineProps<{
  title: string;
  tags: MemoTag[];
  availableTags: MemoTag[];
  mode: "create" | "edit";
  saveStatus?: string;
  showActions?: boolean;
}>();
const emit = defineEmits<{
  (e: "update:title", v: string): void;
  (e: "update:tags", v: MemoTag[]): void;
  (e: "save"): void;
  (e: "delete"): void;
  (e: "createTag", name: string, select: (tag: MemoTag) => void): void;
}>();
</script>
<template>
  <header class="editor-header">
    <div class="title-row">
      <input
        class="title-input"
        :value="title"
        placeholder="タイトル"
        aria-label="メモタイトル"
        @input="emit('update:title', ($event.target as HTMLInputElement).value)"
        @keydown.ctrl.enter.prevent="emit('save')"
        @keydown.meta.enter.prevent="emit('save')"
      />
      <div class="status" aria-live="polite">
        {{ mode === "edit" ? saveStatus : "作成時に保存されます" }}
      </div>
      <div v-if="showActions !== false" class="actions">
        <button class="save" type="button" @click="emit('save')">保存</button>
        <button
          v-if="mode === 'edit'"
          class="delete"
          type="button"
          @click="emit('delete')"
        >
          削除
        </button>
      </div>
    </div>
    <TagPicker
      class="tag-row"
      :model-value="tags"
      :available-tags="availableTags"
      @update:model-value="emit('update:tags', $event)"
      @create-tag="(name, select) => emit('createTag', name, select)"
    />
  </header>
</template>
<style scoped>
.editor-header {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-bottom: 1px solid var(--border);
}
.title-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto auto;
  gap: 12px;
  align-items: center;
}
.title-input {
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  outline: none;
  font-size: clamp(24px, 3vw, 38px);
  font-weight: 800;
}
.status {
  white-space: nowrap;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}
.tag-row {
  min-width: 0;
}
.actions {
  display: flex;
  gap: 8px;
}
.actions button {
  min-height: 40px;
  border: 0;
  border-radius: 9px;
  color: #fff;
  padding: 0 16px;
  font-weight: 700;
  cursor: pointer;
}
.save {
  background: var(--primary);
}
.delete {
  background: var(--danger);
}
@media (max-width: 850px) {
  .editor-header {
    padding: 14px;
  }
  .title-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .status {
    grid-column: 2;
    grid-row: 1;
  }
  .actions button {
    flex: 1;
  }
  .actions {
    grid-column: 1 / -1;
    display: flex;
  }
}

@media (max-width: 520px) {
  .title-row {
    grid-template-columns: 1fr;
  }
  .status {
    grid-column: 1;
    grid-row: auto;
  }
}
</style>

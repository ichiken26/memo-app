<script setup lang="ts">
import type { MemoTag } from "~~/shared/memos";

const router = useRouter();
const memoStore = useMemoStore();
const { user } = useFirebaseAuth();
useLoadMemoStoreForUser(user, memoStore);
const { viewMode, setMode } = useMemoViewMode();

const isSaving = ref(false);
const currentDraft = ref<{
  title: string;
  body: string;
  tags: MemoTag[];
}>({
  title: "",
  body: "",
  tags: [],
});

const createMemo = async (value: {
  title: string;
  body: string;
  tags: MemoTag[];
}) => {
  if (!user.value || isSaving.value) {
    return;
  }

  isSaving.value = true;
  try {
    const memo = await memoStore.createMemo(value);
    await router.push(`/memo/${encodeURIComponent(memo.id)}?mode=edit`);
  } finally {
    isSaving.value = false;
  }
};

const trackDraft = (value: {
  title: string;
  body: string;
  tags: MemoTag[];
}) => {
  currentDraft.value = value;
};

const createAndSelectTag = async (
  name: string,
  selectTag: (tag: MemoTag) => void,
) => {
  if (user.value) {
    const tag = await memoStore.createTag(name);
    if (tag) {
      selectTag(tag);
    }
  }
};
</script>

<template>
  <main class="new-memo-shell">
    <header class="memo-header">
      <TopLogoLink />
      <div>
        <p class="eyebrow">Create</p>
        <h1>メモ作成</h1>
      </div>
    </header>

    <section class="memo-detail">
      <div class="detail-meta">
        <span class="meta-label">新規メモ</span>
        <div class="page-actions">
          <div
            data-shortcut-help-target
            class="global-tools-target action-tools"
          />
          <button
            class="mode-toggle action-mode"
            type="button"
            role="switch"
            :aria-checked="viewMode === 'edit'"
            @click="setMode(viewMode === 'edit' ? 'preview' : 'edit')"
          >
            <span class="toggle-track" aria-hidden="true"><span /></span>
            {{ viewMode === "edit" ? "編集モード" : "閲覧モード" }}
          </button>
          <button
            class="save-button action-save"
            type="button"
            :disabled="isSaving"
            @click="createMemo(currentDraft)"
          >
            保存
          </button>
        </div>
      </div>

      <MemoPreview
        class="memo-preview-workspace"
        editor-mode="create"
        :view-mode="viewMode"
        :available-tags="memoStore.tags.value"
        :header-actions="false"
        @change="trackDraft"
        @save="createMemo"
        @create-tag="createAndSelectTag"
      />
    </section>
  </main>
</template>

<style scoped>
.new-memo-shell {
  display: flex;
  height: 100dvh;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
  padding: 28px;
}

.memo-header {
  flex: 0 0 auto;
  display: flex;
  width: 100%;
  max-width: 1066px;
  min-height: 48px;
  gap: 16px;
  align-items: center;
  margin: 0 auto;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 34px;
}

.memo-detail {
  display: flex;
  width: 100%;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  max-width: 1066px;
  margin: 16px auto 0;
}

.memo-preview-workspace {
  min-height: 0;
  flex: 1;
}

.detail-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: #6b7280;
  font-size: 14px;
  font-weight: 800;
}

.page-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-actions .global-tools-target {
  margin-left: 0;
}

.save-button {
  display: inline-flex;
  height: 44px;
  min-height: 44px !important;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 1px solid transparent !important;
  border-radius: 14px !important;
  padding: 0 14px;
  background: var(--primary);
  box-shadow: var(--button-shadow) !important;
  color: #fff;
  cursor: pointer;
  font-weight: 800;
}

.save-button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.ghost-button {
  min-height: 36px;
  border: 1px solid #cfd3d8;
  border-radius: 8px;
  background: var(--panel);
  color: var(--text);
  cursor: pointer;
  font-weight: 800;
  padding: 0 12px;
}

.mode-toggle {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font: inherit;
  font-weight: 800;
  white-space: nowrap;
}

.toggle-track {
  position: relative;
  width: 34px;
  height: 20px;
  border-radius: 999px;
  background: var(--muted);
}

.toggle-track span {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.18s ease;
}

.mode-toggle[aria-checked="true"] .toggle-track {
  background: var(--primary);
}

.mode-toggle[aria-checked="true"] .toggle-track span {
  transform: translateX(14px);
}

@media (max-width: 760px) {
  .new-memo-shell {
    padding: 18px;
  }

  .detail-meta {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }

  .page-actions {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-areas:
      ". mode"
      "tools save";
    column-gap: 8px;
    row-gap: 16px;
    align-items: center;
  }

  .action-tools {
    grid-area: tools;
  }

  .action-mode {
    grid-area: mode;
    width: 100%;
    min-height: 44px;
    justify-self: stretch;
    justify-content: center;
    white-space: nowrap;
  }

  .action-save {
    grid-area: save;
    width: 100%;
    height: 44px;
    min-height: 44px !important;
    box-sizing: border-box;
  }
}
</style>

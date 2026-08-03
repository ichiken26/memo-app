<script setup lang="ts">
import type { MemoTag } from "~~/shared/memos";

const route = useRoute();
const router = useRouter();
const memoStore = useMemoStore();
const { user } = useFirebaseAuth();
useLoadMemoStoreForUser(user, memoStore);

const memoId = computed(() => String(route.params.id));
const memo = computed(() =>
  user.value ? memoStore.findMemoForOwner(memoId.value, user.value.uid) : null,
);
const saveStatus = ref("保存済み");
const hasUnsavedChanges = ref(false);
const isSaving = ref(false);
const { viewMode, setMode } = useMemoViewMode();
const currentDraft = ref<{
  title: string;
  body: string;
  tags: MemoTag[];
} | null>(null);
watch(
  memo,
  (value) => {
    if (value && !currentDraft.value) {
      currentDraft.value = {
        title: value.title,
        body: value.body,
        tags: value.tags.map((tag) => ({ ...tag })),
      };
    }
  },
  { immediate: true },
);
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let changeVersion = 0;

const saveMemo = async (
  value: { title: string; body: string; tags: MemoTag[] },
  version = changeVersion,
) => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  isSaving.value = true;
  saveStatus.value = "保存中...";
  try {
    if (user.value) {
      await memoStore.updateMemo(memoId.value, value);
    }
    if (version !== changeVersion) {
      return;
    }
    hasUnsavedChanges.value = false;
    saveStatus.value = "保存済み";
  } catch (error) {
    hasUnsavedChanges.value = true;
    saveStatus.value =
      error instanceof Error
        ? `保存失敗: ${error.message}`
        : "保存に失敗しました";
  } finally {
    isSaving.value = false;
  }
};

const queueAutoSave = (value: {
  title: string;
  body: string;
  tags: MemoTag[];
}) => {
  currentDraft.value = value;
  if (!memo.value) {
    return;
  }

  hasUnsavedChanges.value = true;
  changeVersion += 1;
  const version = changeVersion;
  saveStatus.value = "未保存の変更あり";
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => saveMemo(value, version), 1000);
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

const deleteCurrentMemo = async () => {
  if (!user.value || !memo.value) {
    return;
  }
  if (
    !window.confirm(
      `「${memo.value.title}」を削除します。この操作は元に戻せません。`,
    )
  ) {
    return;
  }

  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  hasUnsavedChanges.value = false;
  isSaving.value = false;
  await memoStore.deleteMemo(memo.value.id);
  await router.push("/");
};

const warnBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!hasUnsavedChanges.value && !isSaving.value) {
    return;
  }

  event.preventDefault();
  event.returnValue = "";
};

onMounted(() => {
  window.addEventListener("beforeunload", warnBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", warnBeforeUnload);
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
});

onBeforeRouteLeave(() => {
  if (!hasUnsavedChanges.value && !isSaving.value) {
    return true;
  }

  return window.confirm(
    "保存が完了していない変更があります。ページを離れますか？",
  );
});
</script>

<template>
  <main class="memo-shell">
    <header class="memo-header">
      <TopLogoLink />
    </header>

    <section v-if="memo" class="memo-detail">
      <div class="detail-meta">
        <span class="meta-label">更新日: {{ memo.updatedAt }}</span>
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
            @click="currentDraft && saveMemo(currentDraft)"
          >
            保存
          </button>
          <button
            class="delete-button action-delete"
            type="button"
            @click="deleteCurrentMemo"
          >
            削除
          </button>
        </div>
      </div>
      <MemoPreview
        class="memo-preview-workspace"
        :key="memo.id"
        editor-mode="edit"
        :view-mode="viewMode"
        :memo="memo"
        :available-tags="memoStore.tags.value"
        :save-status="saveStatus"
        :header-actions="false"
        @change="queueAutoSave"
        @save="saveMemo"
        @delete="deleteCurrentMemo"
        @create-tag="createAndSelectTag"
      />
    </section>

    <section v-else class="missing">
      <h1>メモが見つかりません</h1>
      <p>指定されたメモ ID に一致するメモはありません。</p>
    </section>
  </main>
</template>

<style scoped>
.memo-shell {
  display: flex;
  height: 100dvh;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
  padding: 28px;
}

a {
  color: inherit;
  text-decoration: none;
}

.memo-header {
  flex: 0 0 auto;
  display: flex;
  width: 100%;
  max-width: 1066px;
  min-height: 48px;
  align-items: center;
  margin: 0 auto;
}

.missing {
  max-width: 820px;
  margin: 16px auto 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--panel);
  padding: 30px;
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
.save-button,
.delete-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 44px !important;
  min-height: 44px !important;
  max-height: 44px !important;
  border: 1px solid transparent !important;
  border-radius: 14px !important;
  padding: 0 14px !important;
  box-shadow: var(--button-shadow) !important;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;
  line-height: 1 !important;
}
.save-button {
  background: var(--primary);
}
.delete-button {
  background: var(--button-danger);
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
  .memo-shell {
    padding: 18px;
  }

  .detail-meta {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }

  .page-actions {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      ". mode ."
      "tools save delete";
    column-gap: 8px;
    row-gap: 16px;
    align-items: stretch;
  }

  .action-tools {
    grid-area: tools;
    align-self: center;
  }

  .action-mode {
    grid-area: mode;
    width: 100%;
    min-height: 44px;
    justify-self: stretch;
    justify-content: center;
    white-space: nowrap;
  }

  .action-save,
  .action-delete {
    width: 100%;
    height: 44px !important;
    min-height: 44px !important;
    max-height: 44px !important;
    box-sizing: border-box !important;
    padding: 0 14px !important;
    line-height: 1 !important;
  }

  .action-save {
    grid-area: save;
  }

  .action-delete {
    grid-area: delete;
  }
}
</style>

<script setup lang="ts">
import { UNTAGGED_TAG, groupMemoListByTag, type Memo } from "~~/shared/memos";

const memoStore = useMemoStore();
const {
  user,
  isAuthenticated,
  isReady,
  isConfigured,
  displayName,
  authError,
  signInWithGoogle,
  signOut,
} = useFirebaseAuth();
useLoadMemoStoreForUser(user, memoStore);

const userMemos = computed(() =>
  user.value ? memoStore.getMemosByOwner(user.value.uid) : [],
);
const tagGroups = computed(() =>
  groupMemoListByTag(userMemos.value, memoStore.tags.value),
);
const memoPendingDelete = ref<Memo | null>(null);
const isCreatingStarter = ref(false);

const retryLoad = async () => {
  if (user.value) {
    await memoStore.loadForOwner(user.value.uid, { force: true });
  }
};

const createStarterMemo = async () => {
  if (!user.value || isCreatingStarter.value) {
    return;
  }

  isCreatingStarter.value = true;
  try {
    await memoStore.createMemo({
      title: "はじめてのメモ",
      body: "# メモへようこそ\n\nこのメモはあなたのGoogleアカウント専用です。\n\n- Markdownで記述できます\n- Ctrl+Enter / ⌘+Enterで保存できます\n- 右クリックから画像やリンクを挿入できます",
      tags: [],
    });
  } finally {
    isCreatingStarter.value = false;
  }
};

const confirmMemoDelete = async () => {
  if (!user.value || !memoPendingDelete.value) {
    return;
  }

  await memoStore.deleteMemo(memoPendingDelete.value.id);
  memoPendingDelete.value = null;
};
</script>

<template>
  <main class="shell">
    <section v-if="!isAuthenticated" class="auth-screen">
      <div class="auth-panel">
        <p class="eyebrow">Memo Workspace</p>
        <h1>Google 認証でメモにアクセス</h1>
        <p class="lead">
          Firebase
          AuthのGoogleログインで、プロジェクトタグで整理したメモへアクセスします。
        </p>
        <button
          class="google-button"
          type="button"
          :disabled="!isReady || !isConfigured"
          @click="signInWithGoogle"
        >
          <span class="google-mark">G</span>
          {{
            !isConfigured
              ? "Firebase設定が必要です"
              : isReady
                ? "Google でログイン"
                : "認証状態を確認中"
          }}
        </button>
        <p v-if="!isConfigured" class="auth-error">
          .env の NUXT_PUBLIC_FIREBASE_* をFirebase
          Consoleの値に置き換えてください。
        </p>
        <p v-if="authError" class="auth-error">{{ authError }}</p>
      </div>
    </section>

    <template v-else>
      <header class="topbar">
        <div class="topbar-title">
          <TopLogoLink />
          <div>
            <p class="eyebrow">Memo Workspace</p>
            <h1>タグ別メモ一覧</h1>
          </div>
        </div>
        <nav class="nav-actions" aria-label="主要ナビゲーション">
          <div data-shortcut-help-target class="global-tools-target" />
          <div class="nav-buttons">
            <NuxtLink class="button-link primary-link memo-link" to="/memo/new">
              新規メモ
            </NuxtLink>
            <NuxtLink class="button-link tag-link" to="/tags">タグ一覧</NuxtLink>
            <NuxtLink class="button-link search-link" to="/search">検索</NuxtLink>
            <button
              class="ghost-button logout-link"
              type="button"
              @click="signOut"
            >
              Log Out
            </button>
          </div>
        </nav>
      </header>

      <section class="welcome-line">
        <span>{{ displayName }}</span>
        <span>タグの見出しをクリックすると、該当タグの一覧へ移動します。</span>
      </section>

      <section
        v-if="memoStore.isLoading.value"
        class="data-state"
        aria-live="polite"
      >
        <span class="state-spinner" aria-hidden="true" />
        <div>
          <strong>メモを取得しています</strong>
          <p>ログインアカウントに紐づくデータを読み込んでいます。</p>
        </div>
      </section>

      <section
        v-else-if="memoStore.loadError.value"
        class="data-state error-state"
        role="alert"
      >
        <div>
          <strong>メモを取得できませんでした</strong>
          <p>{{ memoStore.loadError.value }}</p>
        </div>
        <button class="ghost-button" type="button" @click="retryLoad">
          再試行
        </button>
      </section>

      <section
        v-else-if="memoStore.isLoaded.value && userMemos.length === 0"
        class="data-state empty-state"
      >
        <div>
          <strong>このアカウントのメモはまだありません</strong>
          <p>
            既存のデモデータは別の所有者に属するため表示されません。最初のメモを作成できます。
          </p>
        </div>
        <button
          class="starter-button"
          type="button"
          :disabled="isCreatingStarter"
          @click="createStarterMemo"
        >
          {{ isCreatingStarter ? "作成中…" : "サンプルメモを作成" }}
        </button>
      </section>

      <section v-else class="tag-grid" aria-label="タグごとのメモプレビュー">
        <article
          v-for="group in tagGroups"
          :key="group.tag.id"
          class="tag-section"
        >
          <div
            v-if="group.tag.id === UNTAGGED_TAG.id"
            class="tag-heading untagged-heading"
          >
            <span
              class="tag-dot"
              :style="{ backgroundColor: group.tag.color }"
            />
            <span>{{ group.tag.name }}</span>
            <span class="count">{{ group.memos.length }}</span>
          </div>
          <NuxtLink
            v-else
            class="tag-heading"
            :to="`/tag/${group.tag.id}?tag=${encodeURIComponent(group.tag.name)}`"
          >
            <span
              class="tag-dot"
              :style="{ backgroundColor: group.tag.color }"
            />
            <span>{{ group.tag.name }}</span>
            <span class="count">{{ group.memos.length }}</span>
          </NuxtLink>

          <MemoPreviewList
            class="memo-list"
            :memos="group.memos"
            @delete="(memo) => (memoPendingDelete = memo)"
          />
        </article>
      </section>

      <ConfirmDeleteModal
        :open="Boolean(memoPendingDelete)"
        title="メモを削除"
        :message="`「${memoPendingDelete?.title ?? ''}」を削除します。この操作は元に戻せません。`"
        @cancel="memoPendingDelete = null"
        @confirm="confirmMemoDelete"
      />
    </template>
  </main>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

.shell {
  min-height: 100vh;
  padding: 32px;
}

.auth-screen {
  display: grid;
  min-height: calc(100vh - 64px);
  place-items: center;
}

.auth-panel {
  width: min(520px, 100%);
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--panel);
  padding: 36px;
  box-shadow: 0 18px 45px rgba(31, 41, 51, 0.08);
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(30px, 4vw, 48px);
  line-height: 1.08;
}

.lead {
  margin: 18px 0 28px;
  color: var(--muted);
  line-height: 1.8;
}

.google-button,
.ghost-button,
.button-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}

.google-button {
  width: 100%;
  gap: 12px;
  border: 1px solid #cfd3d8;
  background: var(--panel);
  color: var(--text);
  font-size: 16px;
}

.google-button:disabled {
  cursor: wait;
  opacity: 0.62;
}

.google-mark {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 50%;
  border: 1px solid #d8dde3;
  color: #2563eb;
  font-weight: 800;
}

.auth-error {
  margin: 14px 0 0;
  color: #b91c1c;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
}

.topbar {
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
  margin: 0 auto 18px;
  max-width: 1180px;
}

.topbar-title {
  display: flex;
  gap: 16px;
  align-items: center;
}

.nav-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.nav-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
}

.button-link {
  padding: 0 18px;
  background: var(--text);
  color: var(--panel);
}

.memo-link {
  font-size: 14px;
}

.tag-link {
  font-size: 14px;
}

.search-link {
  font-size: 15px;
}

.primary-link {
  background: #2563eb;
}

.ghost-button {
  border: 1px solid #cfd3d8;
  padding: 0 18px;
  background: var(--panel);
  color: var(--text);
}

.ghost-button.logout-link {
  border-color: #991b1b;
  background: #b91c1c;
  color: var(--panel);
}

.welcome-line {
  display: flex;
  max-width: 1180px;
  margin: 0 auto 26px;
  gap: 12px;
  color: var(--muted);
  flex-wrap: wrap;
}

.welcome-line span:first-child {
  color: var(--text);
  font-weight: 800;
}

.tag-grid {
  display: grid;
  max-width: 1180px;
  margin: 0 auto;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.tag-section {
  min-width: 0;
}

.tag-heading {
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: 10px;
  border-bottom: 2px solid var(--text);
  font-size: 20px;
  font-weight: 800;
}

.untagged-heading {
  cursor: default;
}

.tag-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.count {
  margin-left: auto;
  color: var(--muted);
  font-size: 14px;
}

.memo-list {
  padding-top: 12px;
}

.data-state {
  display: flex;
  max-width: 1180px;
  min-height: 112px;
  margin: 0 auto 24px;
  padding: 22px 24px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--panel);
  box-shadow: var(--shadow);
}

.data-state strong {
  font-size: 17px;
}

.data-state p {
  margin: 6px 0 0;
  color: var(--muted);
  line-height: 1.6;
}

.error-state {
  border-color: color-mix(in srgb, var(--danger) 50%, var(--border));
}

.starter-button {
  flex: 0 0 auto;
  min-height: 44px;
  border: 0;
  border-radius: 14px;
  background: var(--button-primary);
  box-shadow: var(--button-shadow);
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;
  padding: 0 20px;
}

.state-spinner {
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 760px) {
  .shell {
    padding: 20px;
  }

  .topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .nav-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .nav-actions .global-tools-target {
    margin-left: 0;
    justify-content: flex-end;
  }

  .nav-buttons {
    display: grid;
    width: 100%;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .nav-buttons .button-link,
  .nav-buttons .ghost-button {
    width: 100%;
    min-width: 0;
  }

  .tag-grid {
    grid-template-columns: 1fr;
  }

  .data-state {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>

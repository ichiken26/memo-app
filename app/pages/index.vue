<script setup lang="ts">
import { UNTAGGED_TAG, groupMemoListByTag, type Memo } from '~~/shared/memos'

const memoStore = useMemoStore()
const { user, isAuthenticated, isReady, isConfigured, displayName, authError, signInWithGoogle, signOut } = useFirebaseAuth()
useLoadMemoStoreForUser(user, memoStore)

const userMemos = computed(() => (user.value ? memoStore.getMemosByOwner(user.value.uid) : []))
const tagGroups = computed(() => groupMemoListByTag(userMemos.value, memoStore.tags.value))
const memoPendingDelete = ref<Memo | null>(null)

const confirmMemoDelete = async () => {
  if (!user.value || !memoPendingDelete.value) {
    return
  }

  await memoStore.deleteMemo(memoPendingDelete.value.id, user.value.uid)
  memoPendingDelete.value = null
}
</script>

<template>
  <main class="shell">
    <section v-if="!isAuthenticated" class="auth-screen">
      <div class="auth-panel">
        <p class="eyebrow">Memo Workspace</p>
        <h1>Google 認証でメモにアクセス</h1>
        <p class="lead">
          Firebase AuthのGoogleログインで、プロジェクトタグで整理したメモへアクセスします。
        </p>
        <button class="google-button" type="button" :disabled="!isReady || !isConfigured" @click="signInWithGoogle">
          <span class="google-mark">G</span>
          {{ !isConfigured ? 'Firebase設定が必要です' : isReady ? 'Google でログイン' : '認証状態を確認中' }}
        </button>
        <p v-if="!isConfigured" class="auth-error">
          .env の NUXT_PUBLIC_FIREBASE_* をFirebase Consoleの値に置き換えてください。
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
          <NuxtLink class="button-link primary-link" to="/memo/new">新規メモ</NuxtLink>
          <NuxtLink class="button-link" to="/tags">タグ一覧</NuxtLink>
          <NuxtLink class="button-link" to="/search">検索</NuxtLink>
          <button class="ghost-button" type="button" @click="signOut">ログアウト</button>
        </nav>
      </header>

      <section class="welcome-line">
        <span>{{ displayName }}</span>
        <span>タグの見出しをクリックすると、該当タグの一覧へ移動します。</span>
      </section>

      <section class="tag-grid" aria-label="タグごとのメモプレビュー">
        <article v-for="group in tagGroups" :key="group.tag.id" class="tag-section">
          <div v-if="group.tag.id === UNTAGGED_TAG.id" class="tag-heading untagged-heading">
            <span class="tag-dot" :style="{ backgroundColor: group.tag.color }" />
            <span>{{ group.tag.name }}</span>
            <span class="count">{{ group.memos.length }}</span>
          </div>
          <NuxtLink v-else class="tag-heading" :to="`/tag/${group.tag.id}?tag=${encodeURIComponent(group.tag.name)}`">
            <span class="tag-dot" :style="{ backgroundColor: group.tag.color }" />
            <span>{{ group.tag.name }}</span>
            <span class="count">{{ group.memos.length }}</span>
          </NuxtLink>

          <MemoPreviewList class="memo-list" :memos="group.memos" @delete="(memo) => memoPendingDelete = memo" />
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
  background: #f7f7f4;
  color: #1f2933;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
  border: 1px solid #d9d8d2;
  border-radius: 8px;
  background: #ffffff;
  padding: 36px;
  box-shadow: 0 18px 45px rgba(31, 41, 51, 0.08);
}

.eyebrow {
  margin: 0 0 8px;
  color: #52616b;
  font-size: 13px;
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
  color: #52616b;
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
  background: #ffffff;
  color: #1f2933;
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
  font-size: 13px;
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

.button-link {
  padding: 0 18px;
  background: #1f2933;
  color: #ffffff;
}

.primary-link {
  background: #2563eb;
}

.ghost-button {
  border: 1px solid #cfd3d8;
  padding: 0 18px;
  background: #ffffff;
  color: #1f2933;
}

.welcome-line {
  display: flex;
  max-width: 1180px;
  margin: 0 auto 26px;
  gap: 12px;
  color: #52616b;
  flex-wrap: wrap;
}

.welcome-line span:first-child {
  color: #1f2933;
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
  border-bottom: 2px solid #1f2933;
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
  color: #52616b;
  font-size: 14px;
}

.memo-list {
  padding-top: 12px;
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
  }

  .button-link,
  .ghost-button {
    flex: 1;
  }

  .tag-grid {
    grid-template-columns: 1fr;
  }
}
</style>

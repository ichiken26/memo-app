<script lang="ts">
// 同じ画像を何度も取得しないよう、ユーザー単位で Blob URL を共有する。
// プレビューは入力のたびに再描画されるため、コンポーネント外に置く。
const blobUrlCache = new Map<string, Promise<string>>();
let cacheOwnerUid: string | null = null;

const resetCacheFor = (uid: string | null) => {
  if (cacheOwnerUid === uid) return;
  for (const pending of blobUrlCache.values())
    pending.then(URL.revokeObjectURL, () => {});
  blobUrlCache.clear();
  cacheOwnerUid = uid;
};

/** このアプリの R2 画像 API（認証が必要）を指す URL か */
const isProtectedImageUrl = (url: string) => {
  try {
    const parsed = new URL(url, window.location.origin);
    return (
      parsed.origin === window.location.origin &&
      parsed.pathname.startsWith("/api/images/")
    );
  } catch {
    return false;
  }
};
</script>

<script setup lang="ts">
const props = defineProps<{ url: string; alt: string }>();

const apiFetch = useApiFetch();
const { user } = useFirebaseAuth();
const src = ref<string | undefined>();
const failed = ref(false);

const load = async () => {
  failed.value = false;
  if (!import.meta.client) return;
  if (!isProtectedImageUrl(props.url)) {
    src.value = props.url;
    return;
  }
  const uid = user.value?.uid ?? null;
  resetCacheFor(uid);
  src.value = undefined;
  if (!uid) return; // ログイン完了後に watch から再実行される

  const url = props.url;
  let pending = blobUrlCache.get(url);
  if (!pending) {
    pending = apiFetch<Blob>(url, { responseType: "blob" }).then((blob) =>
      URL.createObjectURL(blob),
    );
    blobUrlCache.set(url, pending);
    // 失敗はキャッシュせず、次回の表示で再試行する
    pending.catch(() => blobUrlCache.delete(url));
  }
  try {
    const objectUrl = await pending;
    if (props.url === url) src.value = objectUrl;
  } catch {
    if (props.url === url) failed.value = true;
  }
};

watch([() => props.url, () => user.value?.uid], load);
onMounted(load);
</script>

<template>
  <img v-if="src" :src="src" :alt="alt" loading="lazy" />
  <span v-else-if="failed" class="memo-image-error" role="img" :aria-label="alt">
    画像を表示できません
  </span>
  <span v-else class="memo-image-loading" role="img" :aria-label="alt" />
</template>

<style scoped>
.memo-image-error,
.memo-image-loading {
  display: block;
  min-height: 3rem;
  border-radius: 6px;
  background: color-mix(in srgb, currentColor 6%, transparent);
}

.memo-image-error {
  padding: 0.75rem;
  font-size: 0.85rem;
  opacity: 0.7;
}
</style>

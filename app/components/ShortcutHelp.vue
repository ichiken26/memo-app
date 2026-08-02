<script setup lang="ts">
const route = useRoute();
const shortcuts = computed(() => [
  "Ctrl+Alt+S: 検索",
  "Ctrl+/: トップ",
  ...(route.path === "/search" ? ["Ctrl+Alt+L: 検索欄"] : []),
  ...(route.path.startsWith("/memo/")
    ? [
        "Ctrl+Alt+E / P: 編集 / 閲覧",
        "Ctrl+B / I: 太字 / 斜体",
        "Ctrl+Alt+R: 赤字",
      ]
    : []),
]);
</script>
<template>
  <div class="shortcut-help">
    <ThemeToggle />
    <AppTooltip label="ショートカット一覧">
      <strong>この画面のショートカット</strong>
      <span v-for="shortcut in shortcuts" :key="shortcut">{{ shortcut }}</span>
    </AppTooltip>
  </div>
</template>
<style scoped>
.shortcut-help {
  display: flex;
  gap: 8px;
  align-items: center;
}
.shortcut-help :deep(.tip-body span) {
  display: block;
}
</style>

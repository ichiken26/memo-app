<script setup lang="ts">
const route = useRoute();
const target = shallowRef<HTMLElement | null>(null);
const isFloating = ref(true);
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

const updateTarget = async () => {
  await nextTick();
  const pageTarget = document.querySelector<HTMLElement>(
    "[data-shortcut-help-target]",
  );
  target.value = pageTarget ?? document.body;
  isFloating.value = !pageTarget;
};

onMounted(updateTarget);
watch(() => route.fullPath, updateTarget, { flush: "post" });
</script>
<template>
  <Teleport v-if="target" :to="target">
    <div class="shortcut-help" :class="{ floating: isFloating }">
      <ThemeToggle />
      <AppTooltip label="ショートカット一覧">
        <strong>この画面のショートカット</strong>
        <span v-for="shortcut in shortcuts" :key="shortcut">{{
          shortcut
        }}</span>
      </AppTooltip>
    </div>
  </Teleport>
</template>
<style scoped>
.shortcut-help {
  display: flex;
  gap: 8px;
  align-items: center;
}
.shortcut-help.floating {
  position: fixed;
  z-index: 60;
  top: 16px;
  right: 16px;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  box-shadow: var(--shadow);
}
.shortcut-help :deep(.tip-body span) {
  display: block;
}
</style>

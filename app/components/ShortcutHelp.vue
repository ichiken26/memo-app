<script setup lang="ts">
import { formatShortcut } from "~~/shared/shortcutKeys";

const route = useRoute();
const target = shallowRef<HTMLElement | null>(null);
const isFloating = ref(true);
let targetObserver: MutationObserver | null = null;
const shortcuts = computed(() => [
  `${formatShortcut("Ctrl", "Alt", "S")}: 検索画面へ遷移`,
  `${formatShortcut("Ctrl", "/")}: トップ画面へ遷移`,
  ...(route.path === "/search"
    ? [`${formatShortcut("Ctrl", "Alt", "L")}: 検索欄`]
    : []),
  ...(route.path.startsWith("/memo/")
    ? [
        `${formatShortcut("Ctrl", "Enter")}: 保存`,
        `${formatShortcut("Ctrl", "Alt", "E")} / ${formatShortcut("Ctrl", "Alt", "P")}: 編集 / 閲覧`,
        `${formatShortcut("Ctrl", "B")} / ${formatShortcut("Ctrl", "I")}: 太字 / 斜体`,
        `${formatShortcut("Ctrl", "Alt", "R")}: 赤字`,
        `${formatShortcut("Ctrl", "Alt", "Q")}: 取り消し線`,
        "Tab / 行頭半角4スペース: 段落を下げる",
        "Shift+Tab / 行頭Backspace: 1段戻す",
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

onMounted(() => {
  void updateTarget();
  targetObserver = new MutationObserver(() => void updateTarget());
  targetObserver.observe(document.getElementById("__nuxt") ?? document.body, {
    childList: true,
    subtree: true,
  });
});
watch(() => route.fullPath, updateTarget, { flush: "post" });
onBeforeUnmount(() => targetObserver?.disconnect());
</script>
<template>
  <Teleport v-if="target" :to="target">
    <div class="shortcut-help" :class="{ floating: isFloating }">
      <ThemeToggle />
      <AppTooltip class="shortcut-help-tip" label="ショートカット一覧">
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

@media (max-width: 760px) {
  .shortcut-help-tip {
    display: none;
  }
}
</style>

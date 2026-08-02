<script setup lang="ts">
const { theme, toggleTheme } = useTheme()
</script>
<template>
  <button
    class="theme-toggle"
    type="button"
    :aria-label="`${theme === 'dark' ? 'ライト' : 'ダーク'}モードに切り替え`"
    @click="toggleTheme"
  >
    {{ theme === 'dark' ? '☀' : '☾' }}
  </button>
</template>
<style scoped>
.theme-toggle {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--panel);
  color: var(--text);
  cursor: pointer;
  font-size: 20px;
}
</style>

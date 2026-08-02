<script setup lang="ts">
withDefaults(defineProps<{ icon?: '?' | '!'; label: string }>(), { icon: '?' })
</script>
<template>
  <span class="tip" tabindex="0">
    <svg class="tip-icon" viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="12.5" fill="none" stroke="currentColor" />
      <text
        x="14"
        y="19"
        text-anchor="middle"
        fill="currentColor"
        font-size="15"
        font-weight="900"
      >
        {{ icon }}
      </text>
    </svg>
    <span class="sr-only">{{ label }}</span>
    <span class="tip-body" role="tooltip">
      <slot>{{ label }}</slot>
    </span>
  </span>
</template>
<style scoped>
.tip {
  position: relative;
  display: inline-grid;
  place-items: center;
}
.tip-icon {
  width: 28px;
  height: 28px;
}
.tip-body {
  position: absolute;
  z-index: 50;
  right: 0;
  top: calc(100% + 8px);
  width: max-content;
  max-width: min(340px, 80vw);
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--panel);
  box-shadow: var(--shadow);
  color: var(--text);
  font-size: 13px;
  line-height: 1.6;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px);
  transition: 0.15s;
}
.tip:hover .tip-body,
.tip:focus .tip-body,
.tip:focus-within .tip-body {
  opacity: 1;
  transform: none;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
</style>

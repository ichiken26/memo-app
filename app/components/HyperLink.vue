<script setup lang="ts">
const props = defineProps<{ title: string; url: string }>();
const host = computed(() => {
  try {
    return new URL(props.url).hostname;
  } catch {
    return props.url;
  }
});
</script>
<template>
  <a class="link-card" :href="url" target="_blank" rel="noopener noreferrer">
    <span class="link-copy">
      <strong>{{ title || host }}</strong>
      <small>{{ host }}</small>
      <span>{{ url }}</span>
    </span>
    <span class="external" aria-hidden="true">↗</span>
  </a>
</template>
<style scoped>
.link-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin: 18px 0;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--panel-soft);
  text-decoration: none;
}
.link-card:hover {
  border-color: var(--primary);
}
.link-copy {
  display: grid;
  gap: 5px;
  min-width: 0;
}
.link-copy span {
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.link-copy small {
  color: var(--muted);
}
.external {
  color: var(--primary);
  font-size: 22px;
}
</style>

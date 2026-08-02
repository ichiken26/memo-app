<script setup lang="ts">
const props = defineProps<{ source: string }>();
const container = ref<HTMLElement | null>(null);
const error = ref("");

const render = async () => {
  if (!container.value) return;
  try {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "neutral",
    });
    const id = `memo-mermaid-${crypto.randomUUID()}`;
    const { svg, bindFunctions } = await mermaid.render(id, props.source);
    container.value.innerHTML = svg;
    bindFunctions?.(container.value);
    error.value = "";
  } catch {
    container.value.textContent = "";
    error.value = "Mermaid図を表示できませんでした";
  }
};

onMounted(render);
watch(() => props.source, render);
</script>

<template>
  <div class="mermaid-wrap">
    <div ref="container" class="diagram" />
    <p v-if="error" role="alert">{{ error }}</p>
  </div>
</template>

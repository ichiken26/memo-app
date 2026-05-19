<script setup lang="ts">
import type { MemoTag } from '~~/shared/memos'

withDefaults(
  defineProps<{
    tag: MemoTag
    removable?: boolean
    asLink?: boolean
  }>(),
  {
    removable: false,
    asLink: true
  }
)

const emit = defineEmits<{
  (event: 'remove', tag: MemoTag): void
}>()
</script>

<template>
  <span class="chip-wrap">
    <NuxtLink
      v-if="asLink"
      class="chip"
      :to="`/tag/${tag.id}?tag=${encodeURIComponent(tag.name)}`"
      @click.stop
    >
      <span class="chip-dot" :style="{ backgroundColor: tag.color }" />
      <span>{{ tag.name }}</span>
    </NuxtLink>
    <span v-else class="chip">
      <span class="chip-dot" :style="{ backgroundColor: tag.color }" />
      <span>{{ tag.name }}</span>
    </span>
    <button v-if="removable" class="remove-button" type="button" :aria-label="`${tag.name} を外す`" @click="emit('remove', tag)">
      x
    </button>
  </span>
</template>

<style scoped>
.chip-wrap {
  display: inline-flex;
  align-items: center;
}

.chip {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  gap: 6px;
  border: 1px solid #d9d8d2;
  border-radius: 999px;
  padding: 4px 9px;
  background: #f7f7f4;
  color: #52616b;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
}

.chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.remove-button {
  width: 24px;
  height: 24px;
  border: 1px solid #d9d8d2;
  border-radius: 50%;
  margin-left: -5px;
  background: #ffffff;
  color: #52616b;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}
</style>

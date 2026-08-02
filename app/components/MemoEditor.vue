<script setup lang="ts">
const props = defineProps<{ modelValue: string; ownerUid?: string }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'save'): void
}>()
const body = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
const textarea = ref<HTMLTextAreaElement | null>(null),
  menu = ref({ open: false, x: 0, y: 0 }),
  file = ref<HTMLInputElement | null>(null),
  uploading = ref(false)
const { format, insertMedia } = useMemoFormatting(body, textarea)
const close = () => (menu.value.open = false)
const context = (e: MouseEvent) => {
  menu.value = { open: true, x: e.clientX, y: e.clientY }
}
const applyFormat = (kind: 'bold' | 'italic' | 'red') => {
  format(kind)
  close()
}
const addLink = () => {
  const selected =
    textarea.value?.value.slice(
      textarea.value.selectionStart,
      textarea.value.selectionEnd,
    ) || 'リンク'
  const url = window.prompt('リンクURL (https://)')
  if (url && /^https?:\/\//.test(url)) insertMedia('link', selected, url)
  close()
}
const upload = async (blob: File) => {
  if (!blob.type.startsWith('image/')) return
  uploading.value = true
  try {
    const form = new FormData()
    form.append('image', blob)
    if (props.ownerUid) form.append('ownerUid', props.ownerUid)
    const result = await $fetch<{ url: string }>('/api/images', {
      method: 'POST',
      body: form,
    })
    insertMedia('img', blob.name || '画像', result.url)
  } finally {
    uploading.value = false
  }
}
const choose = () => {
  file.value?.click()
  close()
}
const onFiles = (files: FileList | null) => {
  const image = files?.[0]
  if (image) upload(image)
}
const keydown = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    emit('save')
  } else if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'b') {
    e.preventDefault()
    format('bold')
  } else if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'i') {
    e.preventDefault()
    format('italic')
  } else if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'r') {
    e.preventDefault()
    format('red')
  }
}
const paste = (e: ClipboardEvent) => {
  const image = Array.from(e.clipboardData?.files || []).find((f) =>
    f.type.startsWith('image/'),
  )
  if (image) {
    e.preventDefault()
    upload(image)
    return
  }
  const text = e.clipboardData?.getData('text/plain').trim() || ''
  if (/^https?:\/\/\S+$/.test(text)) {
    e.preventDefault()
    let label = text
    try {
      label = new URL(text).hostname
    } catch {}
    insertMedia('link', label, text)
  }
}
</script>
<template>
  <div class="editor-area" @click="close">
    <textarea
      ref="textarea"
      v-model="body"
      aria-label="メモ本文"
      placeholder="Markdownでメモを入力"
      @contextmenu.prevent.stop="context"
      @keydown="keydown"
      @paste="paste"
      @dragover.prevent
      @drop.prevent="onFiles($event.dataTransfer?.files || null)"
    />
    <span v-if="uploading" class="uploading">画像をアップロード中…</span>
    <input
      ref="file"
      hidden
      type="file"
      accept="image/png,image/jpeg,image/gif,image/webp"
      @change="onFiles(($event.target as HTMLInputElement).files)"
    />
    <div
      v-if="menu.open"
      class="context"
      :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"
      @click.stop
    >
      <button @click="applyFormat('bold')">
        <b>B</b>
        太字
      </button>
      <button @click="applyFormat('italic')">
        <i>I</i>
        斜体
      </button>
      <button @click="applyFormat('red')">
        <span class="red">R</span>
        赤字
      </button>
      <button @click="choose">画像挿入</button>
      <button @click="addLink">ハイパーリンク</button>
    </div>
  </div>
</template>
<style scoped>
.editor-area {
  position: relative;
  min-height: 480px;
}
.editor-area textarea {
  width: 100%;
  height: 100%;
  min-height: 480px;
  resize: vertical;
  border: 0;
  background: var(--panel);
  color: var(--text);
  padding: 22px;
  outline: none;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 16px;
  line-height: 1.8;
}
.context {
  position: fixed;
  z-index: 80;
  display: grid;
  min-width: 180px;
  padding: 7px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--panel);
  box-shadow: var(--shadow);
}
.context button {
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text);
  padding: 9px 12px;
  text-align: left;
  cursor: pointer;
}
.context button:hover {
  background: var(--panel-soft);
}
.red {
  color: #dc2626;
  font-weight: 800;
}
.uploading {
  position: absolute;
  right: 18px;
  bottom: 16px;
  padding: 6px 10px;
  border-radius: 7px;
  background: var(--text);
  color: var(--panel);
  font-size: 12px;
}
</style>

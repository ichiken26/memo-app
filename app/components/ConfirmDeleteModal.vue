<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel?: string
}>()

const emit = defineEmits<{
  (event: 'cancel'): void
  (event: 'confirm'): void
}>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" role="presentation" @click.self="emit('cancel')">
      <section
        class="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <div class="modal-icon">
          <TrashIcon />
        </div>
        <h2 id="delete-modal-title">{{ title }}</h2>
        <p>{{ message }}</p>
        <div class="modal-actions">
          <button class="cancel-button" type="button" @click="emit('cancel')">キャンセル</button>
          <button class="confirm-button" type="button" @click="emit('confirm')">{{ confirmLabel ?? '削除' }}</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(31, 41, 51, 0.46);
  padding: 20px;
}

.modal-panel {
  width: min(420px, 100%);
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(31, 41, 51, 0.22);
  color: #1f2933;
  padding: 24px;
}

.modal-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 50%;
  background: #fef2f2;
  color: #dc2626;
}

h2 {
  margin: 16px 0 0;
  font-size: 24px;
  line-height: 1.25;
}

p {
  margin: 10px 0 0;
  color: #52616b;
  line-height: 1.7;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.cancel-button,
.confirm-button {
  min-height: 40px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 800;
  padding: 0 16px;
}

.cancel-button {
  border: 1px solid #cfd3d8;
  background: #ffffff;
  color: #1f2933;
}

.confirm-button {
  border: 0;
  background: #dc2626;
  color: #ffffff;
}
</style>

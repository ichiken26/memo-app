import type { Ref } from 'vue'

type AuthUser = {
  uid: string
}

export const useLoadMemoStoreForUser = (
  user: Ref<AuthUser | null>,
  memoStore = useMemoStore(),
) => {
  watch(
    () => user.value?.uid,
    (ownerUid) => {
      if (ownerUid) {
        void memoStore.loadForOwner(ownerUid)
      }
    },
    { immediate: true },
  )

  return memoStore
}

import {
  type Memo,
  type MemoTag
} from '~~/shared/memos'

type MemoInput = {
  ownerUid: string
  title: string
  body: string
  tags: MemoTag[]
}

const cloneMemo = (memo: Memo): Memo => ({
  ...memo,
  tags: memo.tags.map((tag) => ({ ...tag }))
})

export const useMemoStore = () => {
  const memos = useState<Memo[]>('memo-store-memos', () => [])
  const tags = useState<MemoTag[]>('memo-store-tags', () => [])
  const isLoaded = useState('memo-store-loaded', () => false)
  const loadedOwnerUid = useState<string | null>('memo-store-loaded-owner-uid', () => null)
  const pendingOwnerUid = useState<string | null>('memo-store-pending-owner-uid', () => null)

  const findMemo = (id: string) => memos.value.find((memo) => memo.id === id)
  const findMemoForOwner = (id: string, ownerUid: string) =>
    memos.value.find((memo) => memo.id === id && memo.ownerUid === ownerUid)
  const findTag = (id: string) => tags.value.find((tag) => tag.id === id)
  const getMemosByOwner = (ownerUid: string) => memos.value.filter((memo) => memo.ownerUid === ownerUid)

  const loadForOwner = async (ownerUid: string, options: { force?: boolean } = {}) => {
    if (!options.force && isLoaded.value && loadedOwnerUid.value === ownerUid) {
      return
    }
    if (pendingOwnerUid.value === ownerUid) {
      return
    }

    pendingOwnerUid.value = ownerUid
    try {
      const [memoResponse, tagResponse] = await Promise.all([
        $fetch<{ memos: Memo[] }>('/api/memos', { query: { ownerUid } }),
        $fetch<{ tags: MemoTag[] }>('/api/tags', { query: { ownerUid } })
      ])

      memos.value = memoResponse.memos
      tags.value = tagResponse.tags
      loadedOwnerUid.value = ownerUid
      isLoaded.value = true
    } finally {
      if (pendingOwnerUid.value === ownerUid) {
        pendingOwnerUid.value = null
      }
    }
  }

  const createTag = async (ownerUid: string, name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return null
    }

    const { tag } = await $fetch<{ tag: MemoTag }>('/api/tags', {
      method: 'POST',
      body: { ownerUid, name: trimmedName }
    })
    tags.value = [...tags.value.filter((currentTag) => currentTag.id !== tag.id), tag]
    return tag
  }

  const createMemo = async (input: MemoInput) => {
    const { memo } = await $fetch<{ memo: Memo }>('/api/memos', {
      method: 'POST',
      body: input
    })
    memos.value = [memo, ...memos.value]
    return cloneMemo(memo)
  }

  const updateMemo = async (id: string, input: MemoInput) => {
    const { memo: updatedMemo } = await $fetch<{ memo: Memo }>(`/api/memos/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input
    })

    memos.value = memos.value.map((memo) => (memo.id === id ? updatedMemo : memo))
    return cloneMemo(updatedMemo)
  }

  const deleteMemo = async (id: string, ownerUid: string) => {
    await $fetch(`/api/memos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      query: { ownerUid }
    })
    memos.value = memos.value.filter((memo) => memo.id !== id)
  }

  return {
    memos,
    tags,
    isLoaded,
    loadForOwner,
    findMemo,
    findMemoForOwner,
    findTag,
    getMemosByOwner,
    createTag,
    createMemo,
    updateMemo,
    deleteMemo
  }
}

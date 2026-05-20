export type MemoTag = {
  id: string
  name: string
  color: string
}

export type Memo = {
  id: string
  ownerUid: string
  title: string
  body: string
  updatedAt: string
  tags: MemoTag[]
}

export const DEMO_USER_UID = 'demo-user-001'
export const UNTAGGED_TAG: MemoTag = { id: 'untagged', name: 'タグなし', color: '#6b7280' }

export const toIdSegment = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled'

export const toIdDate = (date: string) => date.replaceAll('-', '')

export const createMemoId = (date: string, title: string) => `memo-${toIdDate(date)}-${toIdSegment(title)}`

export const createTagId = (date: string, name: string) => `tag-${toIdDate(date)}-${toIdSegment(name)}`

export const getToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export const createUniqueId = (baseId: string, usedIds: string[]) => {
  if (!usedIds.includes(baseId)) {
    return baseId
  }

  let suffix = 2
  let candidate = `${baseId}-${suffix}`
  while (usedIds.includes(candidate)) {
    suffix += 1
    candidate = `${baseId}-${suffix}`
  }

  return candidate
}

export const createUniqueMemoId = (date: string, title: string, existingMemos: Pick<Memo, 'id'>[]) =>
  createUniqueId(createMemoId(date, title), existingMemos.map((memo) => memo.id))

export const createUniqueTagId = (date: string, name: string, existingTags: Pick<MemoTag, 'id'>[]) =>
  createUniqueId(createTagId(date, name), existingTags.map((tag) => tag.id))

export const tags: MemoTag[] = [
  { id: 'tag-20260501-Product', name: 'Product', color: '#2563eb' },
  { id: 'tag-20260501-Research', name: 'Research', color: '#059669' },
  { id: 'tag-20260501-Meeting', name: 'Meeting', color: '#dc2626' },
  { id: 'tag-20260501-Idea', name: 'Idea', color: '#7c3aed' },
  { id: 'tag-20260501-Personal', name: 'Personal', color: '#ea580c' }
]

export const memos: Memo[] = [
  {
    id: 'memo-20260512-タグ検索-UI-の検討',
    ownerUid: DEMO_USER_UID,
    title: 'タグ検索 UI の検討',
    body: '複数タグを指定した場合は AND 条件で絞り込む。検索履歴は直近 5 件を表示し、検索語の再利用をしやすくする。',
    updatedAt: '2026-05-12',
    tags: [tags[0], tags[1], tags[3]]
  },
  {
    id: 'memo-20260510-5月定例ミーティング議事録',
    ownerUid: DEMO_USER_UID,
    title: '5月定例ミーティング議事録',
    body: '認証、メモ一覧、タグ別詳細、検索画面の導線を確認。API はタグ ID とタグ名のセットを受け取る。',
    updatedAt: '2026-05-10',
    tags: [tags[0], tags[2]]
  },
  {
    id: 'memo-20260508-Nuxt-ルーティング調査',
    ownerUid: DEMO_USER_UID,
    title: 'Nuxt ルーティング調査',
    body: 'pages ディレクトリで /search、/memo/{id}、/tag/{id} を構成する。クエリには表示用のタグ名を保持する。',
    updatedAt: '2026-05-08',
    tags: [tags[1]]
  },
  {
    id: 'memo-20260506-買い物と週末タスク',
    ownerUid: DEMO_USER_UID,
    title: '買い物と週末タスク',
    body: '文房具、付箋、ノートを購入する。個人タスクはプロジェクトタグと分けて管理する。',
    updatedAt: '2026-05-06',
    tags: [tags[4], tags[3]]
  },
  {
    id: 'memo-20260505-認証導入メモ',
    ownerUid: DEMO_USER_UID,
    title: '認証導入メモ',
    body: 'Google OAuth クライアント ID とシークレットを取得し、Nuxt のランタイム設定に登録する。',
    updatedAt: '2026-05-05',
    tags: [tags[0], tags[1]]
  },
  {
    id: 'memo-20260503-検索-API-テスト観点',
    ownerUid: DEMO_USER_UID,
    title: '検索 API テスト観点',
    body: 'タグなし、単一タグ、複数タグ、検索ワードのみ、0件のケースを確認する。',
    updatedAt: '2026-05-03',
    tags: [tags[1], tags[2]]
  }
]

export type SearchInput = {
  searchWord?: string
  tags?: Pick<MemoTag, 'id' | 'name'>[]
  memos?: Memo[]
  ownerUid?: string
}

export const findTagById = (id: string) => tags.find((tag) => tag.id === id)

export const findMemoById = (id: string) => memos.find((memo) => memo.id === id)

export const findMemoByIdAndOwner = (id: string, ownerUid: string) =>
  memos.find((memo) => memo.id === id && memo.ownerUid === ownerUid)

export const createTagColor = (seed: string) => {
  const colors = ['#2563eb', '#059669', '#dc2626', '#7c3aed', '#ea580c', '#0891b2', '#4f46e5']
  const total = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return colors[total % colors.length]
}

export const cloneTags = () => tags.map((tag) => ({ ...tag }))

export const cloneMemos = () =>
  memos.map((memo) => ({
    ...memo,
    tags: memo.tags.map((tag) => ({ ...tag }))
  }))

export const searchMemos = ({
  searchWord = '',
  tags: selectedTags = [],
  memos: targetMemos = memos,
  ownerUid
}: SearchInput) => {
  const searchWords = searchWord
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  const selectedTagIds = selectedTags.map((tag) => tag.id)

  return targetMemos.filter((memo) => {
    const matchesOwner = !ownerUid || memo.ownerUid === ownerUid
    const searchableText = `${memo.title} ${memo.body}`.toLowerCase()
    const matchesWord =
      searchWords.length === 0 || searchWords.every((word) => searchableText.includes(word))

    const matchesTags =
      selectedTagIds.length === 0 ||
      selectedTagIds.every((tagId) => memo.tags.some((tag) => tag.id === tagId))

    return matchesOwner && matchesWord && matchesTags
  })
}

export const groupMemosByTag = () =>
  tags.map((tag) => ({
    tag,
    memos: memos.filter((memo) => memo.tags.some((memoTag) => memoTag.id === tag.id))
  }))

export const groupMemoListByTag = (targetMemos: Memo[], targetTags: MemoTag[]) =>
  [
    ...targetTags.map((tag) => ({
      tag,
      memos: targetMemos.filter((memo) => memo.tags.some((memoTag) => memoTag.id === tag.id))
    })),
    ...(targetMemos.some((memo) => memo.tags.length === 0)
      ? [
          {
            tag: UNTAGGED_TAG,
            memos: targetMemos.filter((memo) => memo.tags.length === 0)
          }
        ]
      : [])
  ]

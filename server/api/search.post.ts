import type { MemoTag } from '../../shared/memos.ts'
import { getDb, searchMemos } from '../utils/d1.ts'
import { requireBodyString } from '../utils/request.ts'

type SearchRequestBody = {
  ownerUid?: string
  search_word?: string
  tags?: Pick<MemoTag, 'id' | 'name'>[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SearchRequestBody>(event)
  const ownerUid = requireBodyString(body, 'ownerUid')

  return {
    results: await searchMemos(getDb(event), {
      searchWord: body.search_word ?? '',
      tags: body.tags ?? [],
      ownerUid
    })
  }
})

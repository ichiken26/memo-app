import { getDb, listMemosByOwner } from '../utils/d1.ts'
import { requireQueryString } from '../utils/request.ts'

export default defineEventHandler(async (event) => {
  const ownerUid = requireQueryString(event, 'ownerUid')

  return {
    memos: await listMemosByOwner(getDb(event), ownerUid)
  }
})

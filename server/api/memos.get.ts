import { getDb, listMemosByOwner } from '../utils/d1'
import { requireQueryString } from '../utils/request'

export default defineEventHandler(async (event) => {
  const ownerUid = requireQueryString(event, 'ownerUid')

  return {
    memos: await listMemosByOwner(getDb(event), ownerUid)
  }
})

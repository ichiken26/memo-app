import { getDb, listTagsByOwner } from '../utils/d1.ts'
import { requireQueryString } from '../utils/request.ts'

export default defineEventHandler(async (event) => {
  const ownerUid = requireQueryString(event, 'ownerUid')

  return { tags: await listTagsByOwner(getDb(event), ownerUid) }
})

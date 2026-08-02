import { getDb, listTagsByOwner } from '../utils/d1'
import { requireQueryString } from '../utils/request'

export default defineEventHandler(async (event) => {
  const ownerUid = requireQueryString(event, 'ownerUid')

  return { tags: await listTagsByOwner(getDb(event), ownerUid) }
})

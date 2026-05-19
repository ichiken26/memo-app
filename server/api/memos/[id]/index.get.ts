import { getDb, getMemoByOwner } from '../../../utils/d1.ts'
import { requireQueryString } from '../../../utils/request.ts'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const ownerUid = requireQueryString(event, 'ownerUid')

  const memo = await getMemoByOwner(getDb(event), id, ownerUid)

  if (!memo) {
    throw createError({ statusCode: 404, statusMessage: 'Memo not found' })
  }

  return { memo }
})

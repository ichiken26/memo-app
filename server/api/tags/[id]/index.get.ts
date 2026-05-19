import { getDb, getTagByOwner } from '../../../utils/d1.ts'
import { requireQueryString } from '../../../utils/request.ts'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const ownerUid = requireQueryString(event, 'ownerUid')

  const tag = await getTagByOwner(getDb(event), id, ownerUid)

  if (!tag) {
    throw createError({ statusCode: 404, statusMessage: 'Tag not found' })
  }

  return { tag }
})

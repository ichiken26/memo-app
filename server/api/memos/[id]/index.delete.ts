import { deleteMemo, getDb } from '../../../utils/d1'
import { requireQueryString } from '../../../utils/request'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const ownerUid = requireQueryString(event, 'ownerUid')

  if (!(await deleteMemo(getDb(event), id, ownerUid))) {
    throw createError({ statusCode: 404, statusMessage: 'Memo not found' })
  }

  return { deleted: true }
})

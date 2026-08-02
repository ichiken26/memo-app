import { createTag, getDb } from '../utils/d1'
import { requireBodyString } from '../utils/request'

type CreateTagBody = {
  ownerUid: string
  name: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateTagBody>(event)
  const name = body.name?.trim()

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Tag name is required' })
  }

  const ownerUid = requireBodyString(body, 'ownerUid')

  const { tag, created } = await createTag(getDb(event), ownerUid, name)

  if (created) {
    setResponseStatus(event, 201)
  }
  return { tag }
})

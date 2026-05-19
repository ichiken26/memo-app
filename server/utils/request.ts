type QueryEvent = Parameters<typeof getQuery>[0]

export const requireQueryString = (event: QueryEvent, key: string) => {
  const value = String(getQuery(event)[key] ?? '').trim()
  if (!value) {
    throw createError({ statusCode: 400, statusMessage: `${key} is required` })
  }

  return value
}

export const requireBodyString = <TBody extends Record<string, unknown>>(body: TBody, key: keyof TBody) => {
  const value = typeof body[key] === 'string' ? body[key].trim() : ''
  if (!value) {
    throw createError({ statusCode: 400, statusMessage: `${String(key)} is required` })
  }

  return value
}

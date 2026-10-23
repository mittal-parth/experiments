import { timingSafeEqual } from 'node:crypto'

export const dynamic = 'force-dynamic'

const LOOKUP_LIMIT = 40

type LookupBody = {
  ids?: unknown
  country?: unknown
}

/** The room asks here for one batch of previews. This process calls Apple; the Worker cannot. */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.PREVIEW_LOOKUP_SECRET ?? ''
  if (!secret || !authorized(request.headers.get('authorization'), secret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const parsed = await readBody(request)
  if (!parsed) return Response.json({ error: 'Bad request' }, { status: 400 })
  const url = `https://itunes.apple.com/lookup?id=${parsed.ids.join(',')}&country=${encodeURIComponent(parsed.country)}`
  const response = await fetch(url, { headers: { accept: 'application/json' } })
  if (!response.ok) return Response.json({ error: 'iTunes lookup failed' }, { status: response.status })
  return new Response(await response.text(), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function authorized(header: string | null, secret: string): boolean {
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  const presented = Buffer.from(token)
  const expected = Buffer.from(secret)
  if (presented.length === 0 || presented.length !== expected.length) return false
  return timingSafeEqual(presented, expected)
}

async function readBody(request: Request): Promise<{ ids: number[]; country: string } | null> {
  let value: LookupBody
  try {
    value = (await request.json()) as LookupBody
  } catch {
    return null
  }
  if (!Array.isArray(value.ids) || value.ids.length === 0 || value.ids.length > LOOKUP_LIMIT) return null
  const ids: number[] = []
  for (const id of value.ids) {
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) return null
    ids.push(id)
  }
  if (typeof value.country !== 'string' || !/^[a-z]{2}$/i.test(value.country)) return null
  return { ids, country: value.country.toLowerCase() }
}

import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const endpoint = 'https://song.mittalparth.dev/api/preview-lookup'

describe('POST /api/preview-lookup', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.PREVIEW_LOOKUP_SECRET
  })

  it('rejects a caller that does not know the secret', async () => {
    process.env.PREVIEW_LOOKUP_SECRET = 'secret'
    const response = await POST(new Request(endpoint, { method: 'POST', body: '{}' }))
    expect(response.status).toBe(401)
  })

  it('forwards one batch to Apple', async () => {
    process.env.PREVIEW_LOOKUP_SECRET = 'secret'
    const fetchImpl = vi.fn(async (url: string) => {
      expect(url).toContain('id=1635014240')
      expect(url).toContain('country=in')
      return new Response(JSON.stringify({ results: [{ trackId: 1635014240, previewUrl: 'https://audio.example/a.m4a' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchImpl)
    const response = await POST(
      new Request(endpoint, {
        method: 'POST',
        headers: { authorization: 'Bearer secret', 'content-type': 'application/json' },
        body: JSON.stringify({ ids: [1635014240], country: 'in' }),
      }),
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as { results: { previewUrl: string }[] }
    expect(body.results[0]?.previewUrl).toBe('https://audio.example/a.m4a')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('rejects a body that is not a short list of track ids', async () => {
    process.env.PREVIEW_LOOKUP_SECRET = 'secret'
    const response = await POST(
      new Request(endpoint, {
        method: 'POST',
        headers: { authorization: 'Bearer secret', 'content-type': 'application/json' },
        body: JSON.stringify({ ids: ['nope'], country: 'in' }),
      }),
    )
    expect(response.status).toBe(400)
  })
})

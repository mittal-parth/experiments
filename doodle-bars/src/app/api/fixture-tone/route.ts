import { toneWav } from '@/server/tone'

export const dynamic = 'force-dynamic'

export function GET(): Response {
  const body = toneWav()
  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Length': String(body.byteLength),
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

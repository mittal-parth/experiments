import { after } from 'next/server'
import { logFixtureTone, posthogLogProvider } from '@/server/posthog-logs'
import { toneWav } from '@/server/tone'

export const dynamic = 'force-dynamic'

export function GET(): Response {
  logFixtureTone('fixture tone requested', { endpoint: '/api/fixture-tone' })
  const body = toneWav()
  logFixtureTone('fixture tone served', {
    endpoint: '/api/fixture-tone',
    content_type: 'audio/wav',
  })
  after(async () => {
    await posthogLogProvider?.forceFlush()
  })
  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Length': String(body.byteLength),
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

import { experimental_upgradeWebSocket } from '@vercel/functions'
import { handleSocket, startTicking, type SocketLike } from '@/server/hub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export function GET() {
  startTicking()
  return experimental_upgradeWebSocket((ws) => {
    handleSocket(ws as unknown as SocketLike)
  })
}

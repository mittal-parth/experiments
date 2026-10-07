import { createServer, type IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import { parse } from 'node:url'
import next from 'next'
import { WebSocketServer } from 'ws'
import { handleSocket, startTicking, type SocketLike } from './src/server/hub'

const dev = process.env.NODE_ENV !== 'production'
const hostname = '127.0.0.1'
const port = Number(process.env.PORT ?? 3000)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

await app.prepare()
startTicking()

const wss = new WebSocketServer({ noServer: true })
const server = createServer((req, res) => {
  handle(req, res, parse(req.url ?? '', true))
})

type UpgradeApp = {
  getUpgradeHandler?: () => (request: IncomingMessage, socket: Duplex, head: Buffer) => void
}

function holdSocket(socket: Duplex): void {
  const originalEnd = socket.end.bind(socket)
  const originalDestroy = socket.destroy.bind(socket)
  let protect = true
  socket.end = ((...args: unknown[]) => {
    if (protect) return socket
    return originalEnd(...(args as []))
  }) as Duplex['end']
  socket.destroy = ((error?: Error) => {
    if (protect) return socket
    return originalDestroy(error)
  }) as Duplex['destroy']
  setTimeout(() => {
    protect = false
  }, 1500)
}

server.on('upgrade', (request, socket, head) => {
  const pathname = parse(request.url ?? '', true).pathname
  if (pathname === '/api/ws') {
    // Next's own upgrade listener matches this route and calls socket.end()
    // after our handshake. Ignore that end so the room socket stays up.
    holdSocket(socket)
    wss.handleUpgrade(request, socket, head, (ws) => {
      handleSocket(ws as unknown as SocketLike)
    })
    return
  }
  const upgrade = (app as unknown as UpgradeApp).getUpgradeHandler?.()
  if (upgrade) {
    upgrade(request, socket, head)
    return
  }
  socket.destroy()
})

server.listen(port, hostname, () => {
  console.log(`Song Guesser ready at http://${hostname}:${port}`)
})

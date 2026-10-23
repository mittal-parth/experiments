import { DurableObject } from 'cloudflare:workers'
import { RoomHost, type RoomConn, type RoomPlatform } from '@/cloudflare/room-host'
import { parseWireRequest } from '@/cloudflare/wire'
import { cleanCode } from '@/game/names'
import { MISSING_ROOM } from '@/rivet/errors'
import { readConnParams, type GameRoomInput, type GameRoomState } from '@/game/room-service'

type Env = {
  GAME_ROOM: DurableObjectNamespace<GameRoom>
  SONG_PREVIEW_MODE?: string
  SONG_ORDER?: string
  GUESS_GRACE_SECONDS?: string
  /** Comma-separated site origins. Empty allows any origin, which is what local dev wants. */
  ALLOWED_ORIGINS?: string
}

type Attachment = { playerId: string; connId: string }

const STATE_KEY = 'state'
const SOCKET_OPEN = 1

/** One room. The 4-character code is the object name. Rules live in `RoomHost`. */
export class GameRoom extends DurableObject<Env> {
  private host!: RoomHost

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    void ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<GameRoomState>(STATE_KEY)
      this.host = new RoomHost(this.platform(), saved ?? null)
      this.host.wake()
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const code = cleanCode(url.pathname.split('/').at(-1) ?? '')
    if (!code) return json({ error: 'That room code is not valid' }, 400)

    if (request.method === 'POST') {
      let input: GameRoomInput
      try {
        input = (await request.json()) as GameRoomInput
      } catch {
        return json({ error: 'Bad request' }, 400)
      }
      const created = this.host.create(input, code)
      if (!created.ok) return json({ error: created.message }, created.status)
      return json({ ok: true }, 201)
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return this.host.exists() ? json({ exists: true }, 200) : json({ error: MISSING_ROOM }, 404)
    }

    const params = readConnParams({
      playerId: url.searchParams.get('playerId'),
      intent: url.searchParams.get('intent'),
    })
    if (!params) return json({ error: 'Join a room first' }, 400)

    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]
    this.ctx.acceptWebSocket(server)
    const attachment: Attachment = { playerId: params.playerId, connId: crypto.randomUUID() }
    server.serializeAttachment(attachment)
    const conn = toConn(server)
    if (!conn) return json({ error: 'Bad request' }, 400)
    if (this.host.admit(conn, params)) {
      this.host.connect(conn)
    } else {
      server.close(1000, 'room not available')
    }
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const conn = toConn(ws)
    if (!conn) return
    const request = parseWireRequest(message)
    if (!request) {
      conn.send({ type: 'error', message: 'Bad request' })
      return
    }
    try {
      await this.host.message(conn, request)
    } catch (error) {
      console.error('room message failed', error)
      conn.send({ type: 'error', message: 'Something went wrong. Try again.' })
    }
  }

  webSocketClose(ws: WebSocket): void {
    const conn = toConn(ws)
    if (conn) this.host.disconnect(conn)
  }

  webSocketError(ws: WebSocket): void {
    const conn = toConn(ws)
    if (conn) this.host.disconnect(conn)
  }

  async alarm(): Promise<void> {
    await this.host.alarm()
  }

  private platform(): RoomPlatform {
    return {
      now: () => Date.now(),
      conns: () => this.ctx.getWebSockets().flatMap((ws) => (ws.readyState === SOCKET_OPEN ? [toConn(ws)] : [])).filter(isConn),
      save: (state) => {
        void this.ctx.storage.put(STATE_KEY, state)
      },
      wipe: async () => {
        for (const ws of this.ctx.getWebSockets()) {
          try {
            ws.close(1000, 'room closed')
          } catch {
            // already closed
          }
        }
        await this.ctx.storage.deleteAlarm()
        await this.ctx.storage.deleteAll()
      },
      setAlarm: (at) => {
        if (at === null) void this.ctx.storage.deleteAlarm()
        else void this.ctx.storage.setAlarm(at)
      },
      previewOptions: () => ({
        mode: this.env.SONG_PREVIEW_MODE === 'fixture' ? 'fixture' : 'live',
        order: this.env.SONG_ORDER === 'catalog' ? 'catalog' : 'shuffle',
        fetchImpl: fetch,
      }),
    }
  }
}

function isConn(value: RoomConn | null): value is RoomConn {
  return value !== null
}

function toConn(ws: WebSocket): RoomConn | null {
  const attachment = ws.deserializeAttachment() as Attachment | null
  if (!attachment) return null
  return {
    id: attachment.connId,
    playerId: attachment.playerId,
    send: (message) => {
      try {
        ws.send(JSON.stringify(message))
      } catch {
        // the socket closed between the check and the send
      }
    },
  }
}

function json(body: unknown, status: number, headers?: HeadersInit): Response {
  return Response.json(body, { status, headers })
}

function originAllowed(request: Request, env: Env): boolean {
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  if (allowed.length === 0) return true
  return allowed.includes(request.headers.get('Origin') ?? '')
}

function corsHeaders(request: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': request.headers.get('Origin') ?? '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/health') return json({ ok: true }, 200)

    const match = /^\/room\/([^/]+)$/.exec(url.pathname)
    const code = match ? cleanCode(match[1] ?? '') : null
    if (!code) return json({ error: 'Not found' }, 404)

    if (!originAllowed(request, env)) return json({ error: 'Origin not allowed' }, 403)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) })

    const room = env.GAME_ROOM.getByName(code)
    if (request.method === 'POST') {
      const response = await room.fetch(request)
      const headers = new Headers(response.headers)
      for (const [key, value] of Object.entries(corsHeaders(request))) headers.set(key, value)
      return new Response(response.body, { status: response.status, headers })
    }
    if (request.method === 'GET') {
      const response = await room.fetch(request)
      if (response.status === 101) return response
      const headers = new Headers(response.headers)
      for (const [key, value] of Object.entries(corsHeaders(request))) headers.set(key, value)
      return new Response(response.body, { status: response.status, headers })
    }
    return json({ error: 'Method not allowed' }, 405)
  },
} satisfies ExportedHandler<Env>

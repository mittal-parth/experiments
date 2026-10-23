/**
 * Cloudflare Worker entry and the `GameRoom` Durable Object.
 *
 * Two layers:
 * - Default export: thin router (`/health`, `/room/:code`), CORS, origin check, then `getByName(code)`.
 * - `GameRoom`: one DO instance per 4-character code; HTTP create/exists + hibernating WebSockets.
 *
 * Game rules live in `src/cloudflare/room-host.ts`, not here.
 */
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
  /** Production rooms POST preview batches here. Unset calls Apple directly. */
  PREVIEW_LOOKUP_URL?: string
  PREVIEW_LOOKUP_SECRET?: string
}

/**
 * Stored on each hibernating WebSocket. Survives DO sleep; used to rebuild `RoomConn` on wake.
 * `connId` distinguishes two tabs for the same `playerId`.
 */
type Attachment = { playerId: string; connId: string }

/** Single persisted blob for the room (`room`, `recentMsgIds`, `lastSeenAt`). */
const STATE_KEY = 'state'

/** `WebSocket.readyState` value for an open socket. */
const SOCKET_OPEN = 1

/**
 * One room. The 4-character code is the Durable Object name (see outer `getByName`).
 * This class is only I/O: storage, alarms, WebSockets, and env → `RoomPlatform`.
 */
export class GameRoom extends DurableObject<Env> {
  private host!: RoomHost

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    // No fetch/WebSocket/alarm until state is loaded and wake() has run (Rivet onWake parity).
    void ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<GameRoomState>(STATE_KEY)
      this.host = new RoomHost(this.platform(), saved ?? null)
      this.host.wake()
    })
  }

  /**
   * Per-room HTTP surface forwarded from the outer Worker.
   *
   * - `POST` — create room (browser does this before opening the WebSocket).
   * - `GET` without upgrade — exists check (`resolve()` on the client).
   * - `GET` with `Upgrade: websocket` — play; query `playerId` + `intent=join|resume`.
   */
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
    // Hibernation API: the DO can sleep while sockets stay connected (lower duration billing).
    this.ctx.acceptWebSocket(server)
    const attachment: Attachment = { playerId: params.playerId, connId: crypto.randomUUID() }
    server.serializeAttachment(attachment)
    const conn = toConn(server)
    if (!conn) return json({ error: 'Bad request' }, 400)
    // admit = onBeforeConnect; connect = onConnect + initial snapshots.
    if (this.host.admit(conn, params)) {
      this.host.connect(conn)
    } else {
      server.close(1000, 'room not available')
    }
    return new Response(null, { status: 101, webSocket: client })
  }

  /** Inbound frames after upgrade; parsed in `wire.ts`, handled in `RoomHost.message`. */
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

  /** DO alarm handler; round reveal and idle reap are multiplexed in `RoomHost.alarm`. */
  async alarm(): Promise<void> {
    await this.host.alarm()
  }

  /** Cloudflare-specific backend for `RoomHost` (keeps room logic free of Workers imports). */
  private platform(): RoomPlatform {
    return {
      now: () => Date.now(),
      conns: () =>
        this.ctx
          .getWebSockets()
          .flatMap((ws) => (ws.readyState === SOCKET_OPEN ? [toConn(ws)] : []))
          .filter(isConn),
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
        // Workers must not use node:https in previews.ts; pass fetch explicitly.
        fetchImpl: fetch,
        lookupUrl: this.env.PREVIEW_LOOKUP_URL,
        lookupSecret: this.env.PREVIEW_LOOKUP_SECRET,
      }),
    }
  }
}

function isConn(value: RoomConn | null): value is RoomConn {
  return value !== null
}

/** Map a DO WebSocket (+ attachment) to the transport-neutral `RoomConn` the host uses. */
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

/**
 * Outer Worker: routes by path, does not run room logic.
 * All `/room/:code` traffic is delegated to the named Durable Object.
 */
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
      // WebSocket upgrade must not be wrapped with extra CORS body handling.
      if (response.status === 101) return response
      const headers = new Headers(response.headers)
      for (const [key, value] of Object.entries(corsHeaders(request))) headers.set(key, value)
      return new Response(response.body, { status: response.status, headers })
    }
    return json({ error: 'Method not allowed' }, 405)
  },
} satisfies ExportedHandler<Env>

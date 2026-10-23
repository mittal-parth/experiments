import { parseServerMessage } from '@/game/protocol'
import type { GameRoomInput } from '@/game/room-service'
import { MISSING_ROOM } from '@/rivet/errors'
import type { WireRequest } from '@/cloudflare/wire'
import type { ConnParams } from '@/game/room-service'
import type { ErrorEvent, SnapshotEvent, SongClient, SongConn } from './types'

const RECONNECT_INITIAL_MS = 500
const RECONNECT_MAX_MS = 5_000
const SOCKET_OPEN = 1

type Status = SongConn['connStatus']
type Listeners = {
  snapshot: Set<(payload: SnapshotEvent) => void>
  error: Set<(payload: ErrorEvent) => void>
  left: Set<(payload: { ok: true }) => void>
}

export function roomHttpBase(wsBase: string): string {
  return wsBase.replace(/^ws/, 'http').replace(/\/+$/, '')
}

function roomWsBase(base: string): string {
  return base.replace(/^http/, 'ws').replace(/\/+$/, '')
}

class RoomRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message)
  }
}

/** One room socket. Reconnects by itself until the room is gone or `dispose` is called. */
class CloudflareConn {
  connStatus: Status = 'idle'
  readonly ready: Promise<void>
  private socket: WebSocket | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private backoff = RECONNECT_INITIAL_MS
  private stopped = false
  private readonly listeners: Listeners = { snapshot: new Set(), error: new Set(), left: new Set() }
  private readonly statusListeners = new Set<(status: Status) => void>()
  private readonly errorListeners = new Set<(error: unknown) => void>()
  private resolveReady: () => void = () => {}

  constructor(
    private readonly url: string,
    private readonly params: ConnParams,
  ) {
    this.ready = new Promise<void>((resolve) => {
      this.resolveReady = resolve
    })
    this.open()
  }

  private setStatus(status: Status): void {
    if (this.connStatus === status) return
    this.connStatus = status
    for (const listener of this.statusListeners) listener(status)
  }

  private open(): void {
    if (this.stopped) return
    this.setStatus('connecting')
    const query = new URLSearchParams({ playerId: this.params.playerId, intent: this.params.intent })
    const socket = new WebSocket(`${this.url}?${query.toString()}`)
    this.socket = socket
    socket.onopen = () => {
      if (this.socket !== socket) return
      this.backoff = RECONNECT_INITIAL_MS
      this.setStatus('connected')
      this.resolveReady()
    }
    socket.onmessage = (event) => {
      if (this.socket !== socket) return
      const message = parseServerMessage(event.data)
      if (!message) return
      switch (message.type) {
        case 'snapshot':
          for (const listener of this.listeners.snapshot) listener({ playerId: message.playerId, view: message.view })
          return
        case 'error':
          if (message.message === MISSING_ROOM) this.stopped = true
          for (const listener of this.listeners.error) listener({ message: message.message })
          return
        case 'left':
          for (const listener of this.listeners.left) listener({ ok: true })
          return
        default: {
          const unexpected: never = message
          throw new Error(`Unexpected value: ${JSON.stringify(unexpected)}`)
        }
      }
    }
    socket.onclose = () => {
      if (this.socket !== socket) return
      this.socket = null
      this.setStatus('disconnected')
      if (this.stopped) return
      const delay = this.backoff
      this.backoff = Math.min(delay * 2, RECONNECT_MAX_MS)
      this.timer = setTimeout(() => {
        this.timer = null
        this.open()
      }, delay)
    }
    socket.onerror = () => {
      for (const listener of this.errorListeners) listener(new Error('Connection failed'))
    }
  }

  private send(request: WireRequest): Promise<void> {
    const socket = this.socket
    if (!socket || socket.readyState !== SOCKET_OPEN) return Promise.reject(new Error('Connection is not open'))
    socket.send(JSON.stringify(request))
    return Promise.resolve()
  }

  onStatusChange(cb: (status: Status) => void): () => void {
    this.statusListeners.add(cb)
    return () => this.statusListeners.delete(cb)
  }

  onError(cb: (error: unknown) => void): () => void {
    this.errorListeners.add(cb)
    return () => this.errorListeners.delete(cb)
  }

  on(name: 'snapshot', cb: (payload: SnapshotEvent) => void): () => void
  on(name: 'error', cb: (payload: ErrorEvent) => void): () => void
  on(name: 'left', cb: (payload: { ok: true }) => void): () => void
  on(name: keyof Listeners, cb: never): () => void {
    const set = this.listeners[name] as Set<unknown>
    set.add(cb)
    return () => set.delete(cb)
  }

  async dispose(): Promise<void> {
    this.stopped = true
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    const socket = this.socket
    this.socket = null
    socket?.close(1000)
    this.setStatus('disconnected')
  }

  join = (nickname: string) => this.send({ type: 'join', nickname })
  configure = (
    msgId: string,
    playlistId: string,
    clipSeconds: number,
    roundCount: number,
    answer: 'song' | 'artist',
  ) => this.send({ type: 'configure', msgId, playlistId, clipSeconds, roundCount, answer })
  start = (msgId: string, avoidTrackIds: number[]) => this.send({ type: 'start', msgId, avoidTrackIds })
  guess = (msgId: string, text: string) => this.send({ type: 'guess', msgId, text })
  next = (msgId: string, roundNumber: number) => this.send({ type: 'next', msgId, roundNumber })
  restart = (msgId: string) => this.send({ type: 'restart', msgId })
  leave = () => this.send({ type: 'leave' })
}

async function readError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
      return body.error
    }
  } catch {
    // not JSON
  }
  return `Request failed (${response.status})`
}

/** `SongClient` over the Cloudflare Worker: HTTP to create or check a room, a WebSocket to play. */
export function createCloudflareClient(endpoint: string): SongClient {
  const http = roomHttpBase(endpoint)
  const ws = roomWsBase(endpoint)
  const roomUrl = (key: string[]) => `${http}/room/${encodeURIComponent(key[0] ?? '')}`
  const handle = (key: string[]) => ({
    resolve: async () => {
      const response = await fetch(roomUrl(key))
      if (response.status === 404) throw new RoomRequestError(MISSING_ROOM, 'not_found')
      if (!response.ok) throw new RoomRequestError(await readError(response), 'request_failed')
      return key[0] ?? ''
    },
    connect: (params: ConnParams): SongConn =>
      new CloudflareConn(`${ws}/room/${encodeURIComponent(key[0] ?? '')}`, params),
  })
  return {
    gameRoom: {
      create: async (key: string[], opts: { input: GameRoomInput }) => {
        const response = await fetch(roomUrl(key), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(opts.input),
        })
        if (response.status === 409) throw new RoomRequestError(await readError(response), 'already_exists')
        if (!response.ok) throw new RoomRequestError(await readError(response), 'request_failed')
        return handle(key)
      },
      get: handle,
    },
    dispose: async () => {},
  }
}

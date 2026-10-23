import type { AnswerMode, RoomView } from '@/game/protocol'
import type { ConnParams, GameRoomInput } from '@/game/room-service'

/** What `useRoom` needs from a backend. Rivet and Cloudflare both implement it. */
export type SnapshotEvent = { playerId: string; view: RoomView }
export type ErrorEvent = { message: string }

export type SongConn = {
  connStatus: 'idle' | 'connecting' | 'connected' | 'disconnected'
  ready: Promise<void>
  dispose: () => Promise<void>
  onStatusChange: (cb: (status: SongConn['connStatus']) => void) => () => void
  onError: (cb: (error: unknown) => void) => () => void
  on(name: 'snapshot', cb: (payload: SnapshotEvent) => void): () => void
  on(name: 'error', cb: (payload: ErrorEvent) => void): () => void
  on(name: 'left', cb: (payload: { ok: true }) => void): () => void
  join: (nickname: string) => Promise<unknown>
  configure: (
    msgId: string,
    playlistId: string,
    clipSeconds: number,
    roundCount: number,
    answer: AnswerMode,
  ) => Promise<unknown>
  start: (msgId: string, avoidTrackIds: number[]) => Promise<unknown>
  guess: (msgId: string, text: string) => Promise<unknown>
  next: (msgId: string, roundNumber: number) => Promise<unknown>
  restart: (msgId: string) => Promise<unknown>
  leave: () => Promise<unknown>
}

export type SongClient = {
  gameRoom: {
    create: (
      key: string[],
      opts: { input: GameRoomInput },
    ) => Promise<{ resolve: () => Promise<string>; connect: (params: ConnParams) => SongConn }>
    get: (key: string[]) => { resolve: () => Promise<string>; connect: (params: ConnParams) => SongConn }
  }
  dispose: () => Promise<void>
}

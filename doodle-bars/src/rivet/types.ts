import type { AnswerMode, RoomView } from '@/game/protocol'
import type { Room } from '@/game/room'

export type GameRoomInput = {
  code: string
  hostId: string
  nickname: string
  playlistId: string
  clipSeconds: number
  roundCount: number
  mode: 'solo' | 'room'
  answer: AnswerMode
}

export type ConnParams = {
  playerId: string
  intent: 'join' | 'resume'
}

export type GameRoomState = {
  room: Room
  recentMsgIds: Record<string, string[]>
  /** When the room last had a socket. Idle reaping is measured from this. */
  lastSeenAt: number
}

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

export type RoomConn = {
  id: string
  state: ConnParams
  send: (name: string, ...args: unknown[]) => void
}

export type ClockCtx = {
  state: GameRoomState
  schedule: {
    after: (duration: number, action: string, ...args: unknown[]) => Promise<string>
  }
}

export type RoomCtx = ClockCtx & {
  conns: { size: number; values: () => Iterable<RoomConn> }
  destroy: () => void
}

export type ActionCtx = RoomCtx & { conn: RoomConn }

export type RoomClient = {
  gameRoom: {
    create: (key: string[], opts: { input: GameRoomInput }) => Promise<unknown>
    get: (key: string[]) => {
      resolve: () => Promise<string>
      connect: (params: ConnParams) => {
        ready: Promise<void>
        dispose: () => Promise<void>
        on: (name: string, cb: (...args: any[]) => void) => void
        join: (nickname: string) => Promise<unknown>
        start: (msgId: string, avoidTrackIds: number[]) => Promise<unknown>
        guess: (msgId: string, text: string) => Promise<unknown>
        next: (msgId: string, roundNumber: number) => Promise<unknown>
        restart: (msgId: string) => Promise<unknown>
        leave: () => Promise<unknown>
      }
    }
  }
}

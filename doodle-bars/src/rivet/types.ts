import type { ConnParams, GameRoomInput, GameRoomState } from '@/game/room-service'

export type { ConnParams, GameRoomInput, GameRoomState } from '@/game/room-service'

export type {
  ErrorEvent,
  SnapshotEvent,
  SongClient,
  SongConn,
} from '@/transport/types'

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

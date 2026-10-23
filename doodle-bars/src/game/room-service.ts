import { getPlaylist } from '@/catalog/registry'
import { cleanCode, cleanNickname } from '@/game/names'
import type { AnswerMode } from '@/game/protocol'
import { createRoom, type Room } from '@/game/room'

export const MSG_LIMIT = 32
export const REAP_MS = 6 * 60 * 60 * 1000

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

export class RoomInputError extends Error {}

/** Validates a create request and builds the first saved room. Shared by every backend. */
export function createInitialState(input: GameRoomInput, key: string, now: number): GameRoomState {
  const nickname = cleanNickname(input.nickname)
  if (!nickname) throw new RoomInputError('Use 2-16 letters or numbers')

  const playlist = getPlaylist(input.playlistId)
  if (!playlist) throw new RoomInputError('Unknown playlist')

  const code = cleanCode(key)
  if (!code) throw new RoomInputError('That room code is not valid')

  return {
    room: createRoom({
      code,
      hostId: input.hostId,
      nickname,
      playlistId: playlist.id,
      playlistName: playlist.name,
      clipSeconds: input.clipSeconds,
      roundCount: input.roundCount,
      mode: input.mode,
      answer: input.answer,
    }),
    recentMsgIds: {},
    lastSeenAt: now,
  }
}

/** Accepts `{ playerId, intent }` from a connect handshake. Returns null when the shape is wrong. */
export function readConnParams(params: unknown): ConnParams | null {
  if (typeof params !== 'object' || params === null) return null
  if (!('playerId' in params) || typeof params.playerId !== 'string') return null
  if (params.playerId.length === 0 || params.playerId.length > 80) return null
  if (!('intent' in params) || (params.intent !== 'join' && params.intent !== 'resume')) return null
  return { playerId: params.playerId, intent: params.intent }
}

/** True when this player already applied `msgId`. An empty id is never treated as a repeat. */
export function duplicate(c: { state: GameRoomState }, playerId: string, msgId: string): boolean {
  if (!msgId) return false
  return (c.state.recentMsgIds[playerId] ?? []).includes(msgId)
}

/** Stores `msgId` for this player, keeping the last 32. */
export function remember(c: { state: GameRoomState }, playerId: string, msgId: string): void {
  if (!msgId) return
  const prior = c.state.recentMsgIds[playerId] ?? []
  const next = prior.filter((id) => id !== msgId)
  next.push(msgId)
  while (next.length > MSG_LIMIT) next.shift()
  c.state.recentMsgIds = { ...c.state.recentMsgIds, [playerId]: next }
}

/** Drops `msgId` so a failed start can be retried with the same id. */
export function forget(c: { state: GameRoomState }, playerId: string, msgId: string): void {
  if (!msgId) return
  const prior = c.state.recentMsgIds[playerId]
  if (!prior) return
  c.state.recentMsgIds = {
    ...c.state.recentMsgIds,
    [playerId]: prior.filter((id) => id !== msgId),
  }
}

/** Positive integer track ids from the client, capped at 500, so a new round can avoid songs already played. */
export function trackIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const ids: number[] = []
  for (const item of value) {
    if (typeof item !== 'number' || !Number.isInteger(item) || item <= 0) continue
    ids.push(item)
    if (ids.length > 500) ids.shift()
  }
  return ids
}

/** Milliseconds since the last socket. Rooms saved before `lastSeenAt` existed count as just seen. */
export function idleSince(state: GameRoomState): number {
  return typeof state.lastSeenAt === 'number' ? state.lastSeenAt : Date.now()
}

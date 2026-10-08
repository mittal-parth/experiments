import { assertNever } from './assert-never'
import { DEFAULT_ROUNDS } from './constants'

export type Phase = 'lobby' | 'playing' | 'reveal' | 'done'

export type AnswerMode = 'song' | 'artist'

export type SetlistEntry = {
  title: string
  artist: string
  storeUrl: string
  guessed: boolean
  guessedBy: string[]
}

export type GuessFeedback = {
  correct: boolean
  close: boolean
  artist: boolean
  song: boolean
  points: number
}

export type SharedGuess = {
  id: string
  playerId: string
  nickname: string
  text: string
  kind: 'miss' | 'close' | 'correct' | 'artist' | 'song'
  points: number
}

export type RoundScore = {
  nickname: string
  points: number
  kind: 'correct' | 'artist'
}

export type RoundRecap = {
  title: string
  artist: string
  storeUrl: string
  scores: RoundScore[]
}

export type RoomView = {
  code: string
  mode: 'solo' | 'room'
  answer: AnswerMode
  phase: Phase
  playlistId: string
  playlistName: string
  clipSeconds: number
  roundCount: number
  roundNumber: number
  totalRounds: number
  setlist: SetlistEntry[]
  you: { id: string; isHost: boolean; nickname: string }
  players: {
    id: string
    nickname: string
    score: number
    solved: boolean
    namedArtist: boolean
    connected: boolean
  }[]
  clip: { previewUrl: string } | null
  reveal: { title: string; artist: string; storeUrl: string; trackId: number } | null
  artworkUrl: string | null
  guesses: SharedGuess[]
  recap: RoundRecap[]
  lastGuess: GuessFeedback | null
  roundEndsAt: number | null
  starting: boolean
}

export type RoomClaim = { code?: string; playerId?: string }

export type ClientMessage =
  | {
      type: 'create'
      nickname: string
      playlistId: string
      clipSeconds: number
      roundCount: number
      mode: 'solo' | 'room'
      answer: AnswerMode
    }
  | { type: 'join'; code: string; nickname: string }
  | { type: 'resume'; code: string; playerId: string }
  | ({
      type: 'configure'
      playlistId: string
      clipSeconds: number
      roundCount: number
      answer: AnswerMode
    } & RoomClaim)
  | ({ type: 'start'; avoidTrackIds: number[] } & RoomClaim)
  | ({ type: 'guess'; text: string } & RoomClaim)
  | ({ type: 'next'; roundNumber: number } & RoomClaim)
  | ({ type: 'restart' } & RoomClaim)
  | { type: 'leave' }

export type ServerMessage =
  | { type: 'snapshot'; playerId: string; view: RoomView }
  | { type: 'error'; message: string }
  | { type: 'left' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > max) return null
  return trimmed
}

function readTrackIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const ids: number[] = []
  for (const item of value) {
    if (typeof item !== 'number' || !Number.isInteger(item) || item <= 0) continue
    const existing = ids.indexOf(item)
    if (existing >= 0) ids.splice(existing, 1)
    ids.push(item)
    if (ids.length > 500) ids.shift()
  }
  return ids
}

export function parseClientMessage(value: unknown): ClientMessage | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null
  switch (value.type) {
    case 'create': {
      const nickname = readString(value.nickname, 16)
      const playlistId = readString(value.playlistId, 40)
      if (!nickname || !playlistId) return null
      if (typeof value.clipSeconds !== 'number') return null
      if (value.mode !== 'solo' && value.mode !== 'room') return null
      const answer = readAnswer(value.answer)
      if (!answer) return null
      return {
        type: 'create',
        nickname,
        playlistId,
        clipSeconds: value.clipSeconds,
        roundCount: readRoundCount(value.roundCount),
        mode: value.mode,
        answer,
      }
    }
    case 'join': {
      const nickname = readString(value.nickname, 16)
      const code = readString(value.code, 8)
      if (!nickname || !code) return null
      return { type: 'join', nickname, code }
    }
    case 'resume': {
      const code = readString(value.code, 8)
      const playerId = readString(value.playerId, 80)
      if (!code || !playerId) return null
      return { type: 'resume', code, playerId }
    }
    case 'configure': {
      const playlistId = readString(value.playlistId, 40)
      if (!playlistId || typeof value.clipSeconds !== 'number') return null
      const answer = readAnswer(value.answer)
      if (!answer) return null
      return withClaim(
        {
          type: 'configure',
          playlistId,
          clipSeconds: value.clipSeconds,
          roundCount: readRoundCount(value.roundCount),
          answer,
        },
        value,
      )
    }
    case 'start':
      return withClaim({ type: 'start', avoidTrackIds: readTrackIds(value.avoidTrackIds) }, value)
    case 'guess': {
      const text = readString(value.text, 80)
      if (!text) return null
      return withClaim({ type: 'guess', text }, value)
    }
    case 'next':
      return withClaim({ type: 'next', roundNumber: readRoundNumber(value.roundNumber) }, value)
    case 'restart':
      return withClaim({ type: 'restart' }, value)
    case 'leave':
      return { type: 'leave' }
    default:
      return null
  }
}

export function parseServerMessage(value: unknown): ServerMessage | null {
  const parsed: unknown = typeof value === 'string' ? safeJson(value) : value
  if (!isRecord(parsed) || typeof parsed.type !== 'string') return null
  switch (parsed.type) {
    case 'snapshot': {
      if (typeof parsed.playerId !== 'string' || !isRecord(parsed.view)) return null
      return { type: 'snapshot', playerId: parsed.playerId, view: parsed.view as RoomView }
    }
    case 'error': {
      if (typeof parsed.message !== 'string') return null
      return { type: 'error', message: parsed.message }
    }
    case 'left':
      return { type: 'left' }
    default:
      return null
  }
}

export function stampSession(
  message: ClientMessage,
  session: { code: string; playerId: string } | null,
): ClientMessage {
  if (!session) return message
  switch (message.type) {
    case 'configure':
    case 'start':
    case 'guess':
    case 'next':
    case 'restart':
      return { ...message, code: session.code, playerId: session.playerId }
    case 'create':
    case 'join':
    case 'resume':
    case 'leave':
      return message
    default:
      return assertNever(message)
  }
}

function withClaim(message: ClientMessage, value: Record<string, unknown>): ClientMessage {
  const code = readString(value.code, 8)
  const playerId = readString(value.playerId, 80)
  if (!code || !playerId) return message
  switch (message.type) {
    case 'configure':
    case 'start':
    case 'guess':
    case 'next':
    case 'restart':
      return { ...message, code, playerId }
    case 'create':
    case 'join':
    case 'resume':
    case 'leave':
      return message
    default:
      return assertNever(message)
  }
}

function readRoundCount(value: unknown): number {
  return typeof value === 'number' ? value : DEFAULT_ROUNDS
}

function readRoundNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) return 0
  return value
}

function readAnswer(value: unknown): AnswerMode | null {
  if (value === undefined) return 'song'
  if (value === 'song' || value === 'artist') return value
  return null
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

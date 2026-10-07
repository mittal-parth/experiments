export type Phase = 'lobby' | 'playing' | 'reveal' | 'done'

export type GuessFeedback = {
  correct: boolean
  close: boolean
  points: number
}

export type SharedGuess = {
  id: string
  playerId: string
  nickname: string
  text: string
  kind: 'miss' | 'close' | 'correct'
  points: number
}

export type RoomView = {
  code: string
  mode: 'solo' | 'room'
  phase: Phase
  playlistId: string
  playlistName: string
  clipSeconds: number
  roundNumber: number
  totalRounds: number
  you: { id: string; isHost: boolean; nickname: string }
  players: {
    id: string
    nickname: string
    score: number
    solved: boolean
    connected: boolean
  }[]
  clip: { previewUrl: string } | null
  reveal: { title: string; artist: string; storeUrl: string } | null
  artworkUrl: string | null
  guesses: SharedGuess[]
  lastGuess: GuessFeedback | null
  roundEndsAt: number | null
  starting: boolean
}

export type ClientMessage =
  | {
      type: 'create'
      nickname: string
      playlistId: string
      clipSeconds: number
      mode: 'solo' | 'room'
    }
  | { type: 'join'; code: string; nickname: string }
  | { type: 'resume'; code: string; playerId: string }
  | { type: 'configure'; playlistId: string; clipSeconds: number }
  | { type: 'start' }
  | { type: 'guess'; text: string }
  | { type: 'next' }
  | { type: 'restart' }
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

export function parseClientMessage(value: unknown): ClientMessage | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null
  switch (value.type) {
    case 'create': {
      const nickname = readString(value.nickname, 16)
      const playlistId = readString(value.playlistId, 40)
      if (!nickname || !playlistId) return null
      if (typeof value.clipSeconds !== 'number') return null
      if (value.mode !== 'solo' && value.mode !== 'room') return null
      return {
        type: 'create',
        nickname,
        playlistId,
        clipSeconds: value.clipSeconds,
        mode: value.mode,
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
      return { type: 'configure', playlistId, clipSeconds: value.clipSeconds }
    }
    case 'start':
      return { type: 'start' }
    case 'guess': {
      const text = readString(value.text, 80)
      if (!text) return null
      return { type: 'guess', text }
    }
    case 'next':
      return { type: 'next' }
    case 'restart':
      return { type: 'restart' }
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

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

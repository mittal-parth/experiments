import type { AnswerMode } from '@/game/protocol'

/** What the browser sends over the room WebSocket. The caller is the socket, never the body. */
export type WireRequest =
  | { type: 'join'; nickname: string }
  | {
      type: 'configure'
      msgId: string
      playlistId: string
      clipSeconds: number
      roundCount: number
      answer: AnswerMode
    }
  | { type: 'start'; msgId: string; avoidTrackIds: number[] }
  | { type: 'guess'; msgId: string; text: string }
  | { type: 'next'; msgId: string; roundNumber: number }
  | { type: 'restart'; msgId: string }
  | { type: 'leave' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readMsgId(value: unknown): string {
  return typeof value === 'string' && value.length <= 80 ? value : ''
}

function readText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > max) return null
  return trimmed
}

export function parseWireRequest(raw: string | ArrayBuffer): WireRequest | null {
  if (typeof raw !== 'string') return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(value) || typeof value.type !== 'string') return null
  switch (value.type) {
    case 'join': {
      const nickname = readText(value.nickname, 16)
      return nickname ? { type: 'join', nickname } : null
    }
    case 'configure': {
      const playlistId = readText(value.playlistId, 40)
      if (!playlistId) return null
      if (typeof value.clipSeconds !== 'number' || typeof value.roundCount !== 'number') return null
      if (value.answer !== 'song' && value.answer !== 'artist') return null
      return {
        type: 'configure',
        msgId: readMsgId(value.msgId),
        playlistId,
        clipSeconds: value.clipSeconds,
        roundCount: value.roundCount,
        answer: value.answer,
      }
    }
    case 'start':
      return {
        type: 'start',
        msgId: readMsgId(value.msgId),
        avoidTrackIds: Array.isArray(value.avoidTrackIds)
          ? value.avoidTrackIds.filter((item): item is number => typeof item === 'number')
          : [],
      }
    case 'guess': {
      const text = readText(value.text, 80)
      return text ? { type: 'guess', msgId: readMsgId(value.msgId), text } : null
    }
    case 'next':
      return {
        type: 'next',
        msgId: readMsgId(value.msgId),
        roundNumber: typeof value.roundNumber === 'number' ? value.roundNumber : 0,
      }
    case 'restart':
      return { type: 'restart', msgId: readMsgId(value.msgId) }
    case 'leave':
      return { type: 'leave' }
    default:
      return null
  }
}

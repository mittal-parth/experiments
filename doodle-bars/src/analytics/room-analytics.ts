import type { Phase, RoomView } from '@/game/protocol'
import { captureGameEvent } from './posthog-client'

type EventProps = Record<string, string | number | boolean>
type PresenceKey = string

let lastPhase: Phase | null = null
let playingStartedAt: number | null = null
let roomEnteredAt: number | null = null
let lastPresenceKey: PresenceKey | null = null

function roomProps(view: RoomView): EventProps {
  const connectedPlayerCount = view.players.filter((player) => player.connected).length
  return {
    game_mode: view.mode,
    game_phase: view.phase,
    playlist_id: view.playlistId,
    player_count: view.players.length,
    connected_player_count: connectedPlayerCount,
    round_count: view.totalRounds,
    clip_seconds: view.clipSeconds,
    answer_mode: view.answer,
  }
}

function presenceKey(view: RoomView): PresenceKey {
  const connectedPlayerCount = view.players.filter((player) => player.connected).length
  return `${view.phase}:${view.players.length}:${connectedPlayerCount}`
}

function flushPlayingSegment(view: RoomView | null, reason: string): void {
  if (playingStartedAt === null) return
  const durationSeconds = Math.max(0, Math.round((Date.now() - playingStartedAt) / 1000))
  playingStartedAt = null
  captureGameEvent('playtime_playing', {
    duration_seconds: durationSeconds,
    end_reason: reason,
    ...(view ? roomProps(view) : { game_phase: 'left' }),
  })
}

export function onRoomViewChange(view: RoomView | null): void {
  if (!view) {
    flushPlayingSegment(null, 'room_cleared')
    if (roomEnteredAt !== null) {
      const sessionDurationSeconds = Math.max(0, Math.round((Date.now() - roomEnteredAt) / 1000))
      captureGameEvent('playtime_room', {
        duration_seconds: sessionDurationSeconds,
        end_reason: 'room_cleared',
        game_phase: lastPhase ?? 'unknown',
      })
      roomEnteredAt = null
    }
    lastPhase = null
    lastPresenceKey = null
    return
  }

  if (roomEnteredAt === null) roomEnteredAt = Date.now()

  const phase = view.phase
  if (lastPhase !== 'playing' && phase === 'playing') {
    playingStartedAt = Date.now()
  } else if (lastPhase === 'playing' && phase !== 'playing') {
    flushPlayingSegment(view, `phase_${phase}`)
  }

  if (lastPhase !== 'done' && phase === 'done') {
    captureGameEvent('game_completed', roomProps(view))
    if (roomEnteredAt !== null) {
      const sessionDurationSeconds = Math.max(0, Math.round((Date.now() - roomEnteredAt) / 1000))
      captureGameEvent('playtime_room', {
        ...roomProps(view),
        duration_seconds: sessionDurationSeconds,
        end_reason: 'game_done',
      })
      roomEnteredAt = Date.now()
    }
  }

  const key = presenceKey(view)
  if (key !== lastPresenceKey) {
    lastPresenceKey = key
    captureGameEvent('room_presence', roomProps(view))
  }

  lastPhase = phase
}

export function onRoomLeave(view: RoomView | null): void {
  flushPlayingSegment(view, 'leave')
  if (roomEnteredAt !== null) {
    const sessionDurationSeconds = Math.max(0, Math.round((Date.now() - roomEnteredAt) / 1000))
    captureGameEvent('playtime_room', {
      duration_seconds: sessionDurationSeconds,
      end_reason: 'leave',
      game_phase: view?.phase ?? lastPhase ?? 'unknown',
      ...(view ? roomProps(view) : {}),
    })
    roomEnteredAt = null
  }
  lastPhase = null
  lastPresenceKey = null
}

export function reportSessionHeartbeat(view: RoomView): void {
  captureGameEvent('session_heartbeat', roomProps(view))
}

export function reportClientError(message: string, source: string): void {
  captureGameEvent('client_error', {
    error_message: message.slice(0, 240),
    error_source: source,
  })
}

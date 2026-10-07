import { MAX_PLAYERS } from './constants'
import { clampClipSeconds } from './clip'
import { judgeGuess } from './guess'
import type { GuessFeedback, RoomView, SharedGuess } from './protocol'
import { pointsForGuess, roundDurationMs } from './score'

export type RoundSong = {
  trackId: number
  title: string
  artist: string
  aliases: string[]
  previewUrl: string
  storeUrl: string
  artworkUrl: string | null
}

export type Player = {
  id: string
  nickname: string
  score: number
  connected: boolean
}

export type Room = {
  code: string
  mode: 'solo' | 'room'
  hostId: string
  playlistId: string
  playlistName: string
  clipSeconds: number
  players: Player[]
  phase: RoomView['phase']
  roundIndex: number
  songs: RoundSong[]
  roundStartedAt: number | null
  roundEndsAt: number | null
  solvedIds: string[]
  guesses: SharedGuess[]
  feedback: Record<string, GuessFeedback>
  starting: boolean
}

export type RoomResult = { ok: true; room: Room } | { ok: false; error: string }

export function createRoom(input: {
  code: string
  hostId: string
  nickname: string
  playlistId: string
  playlistName: string
  clipSeconds: number
  mode: 'solo' | 'room'
}): Room {
  return {
    code: input.code,
    mode: input.mode,
    hostId: input.hostId,
    playlistId: input.playlistId,
    playlistName: input.playlistName,
    clipSeconds: clampClipSeconds(input.clipSeconds),
    players: [
      { id: input.hostId, nickname: input.nickname, score: 0, connected: true },
    ],
    phase: 'lobby',
    roundIndex: -1,
    songs: [],
    roundStartedAt: null,
    roundEndsAt: null,
    solvedIds: [],
    guesses: [],
    feedback: {},
    starting: false,
  }
}

export function joinRoom(room: Room, player: { id: string; nickname: string }): RoomResult {
  if (room.mode === 'solo') return { ok: false, error: 'That game is solo' }
  if (room.phase !== 'lobby') return { ok: false, error: 'This game already started' }
  if (room.players.length >= MAX_PLAYERS) return { ok: false, error: 'That room is full' }
  if (room.players.some((item) => item.id === player.id)) {
    return { ok: false, error: 'You are already in this room' }
  }
  const next = structuredClone(room)
  next.players.push({
    id: player.id,
    nickname: player.nickname,
    score: 0,
    connected: true,
  })
  return { ok: true, room: next }
}

export function configureRoom(
  room: Room,
  playerId: string,
  playlistId: string,
  playlistName: string,
  clipSeconds: number,
): RoomResult {
  if (room.hostId !== playerId) return { ok: false, error: 'Only the host can do that' }
  if (room.phase !== 'lobby' || room.starting) {
    return { ok: false, error: 'You can only change settings in the lobby' }
  }
  const next = structuredClone(room)
  next.playlistId = playlistId
  next.playlistName = playlistName
  next.clipSeconds = clampClipSeconds(clipSeconds)
  return { ok: true, room: next }
}

export function markStarting(room: Room, playerId: string): RoomResult {
  if (room.hostId !== playerId) return { ok: false, error: 'Only the host can do that' }
  if (room.phase !== 'lobby') return { ok: false, error: 'The game already started' }
  if (room.starting) return { ok: false, error: 'Already starting' }
  const next = structuredClone(room)
  next.starting = true
  return { ok: true, room: next }
}

export function abortStarting(room: Room): Room {
  const next = structuredClone(room)
  next.starting = false
  return next
}

export function beginGame(
  room: Room,
  songs: RoundSong[],
  now: number,
  graceSeconds: number,
): RoomResult {
  if (room.phase !== 'lobby') return { ok: false, error: 'The game already started' }
  if (!room.starting) return { ok: false, error: 'The game is not starting' }
  if (songs.length === 0) return { ok: false, error: 'No songs' }
  const next = structuredClone(room)
  next.songs = songs.map((song) => ({ ...song, aliases: [...song.aliases] }))
  next.phase = 'playing'
  next.roundIndex = 0
  next.starting = false
  next.solvedIds = []
  next.guesses = []
  next.feedback = {}
  const duration = roundDurationMs(next.clipSeconds, graceSeconds)
  next.roundStartedAt = now
  next.roundEndsAt = now + duration
  for (const player of next.players) player.score = 0
  return { ok: true, room: next }
}

export function submitGuess(room: Room, playerId: string, text: string, now: number): RoomResult {
  if (room.phase !== 'playing') return { ok: false, error: 'Wait for the next round' }
  if (room.roundEndsAt !== null && now >= room.roundEndsAt) {
    return { ok: true, room: syncPhase(room, now) }
  }
  const player = room.players.find((item) => item.id === playerId)
  if (!player) return { ok: false, error: 'You are not in this room' }
  if (room.solvedIds.includes(playerId)) return { ok: false, error: 'You already have this one' }
  const song = room.songs[room.roundIndex]
  if (!song) return { ok: false, error: 'No song in this round' }
  const next = structuredClone(room)
  const judgement = judgeGuess(text, song.title, song.aliases)
  if (judgement === 'close') {
    next.feedback[playerId] = { correct: false, close: true, points: 0 }
    next.guesses.push(guessNote(next, player, text, 'close', 0))
    return { ok: true, room: next }
  }
  if (judgement === 'miss') {
    next.feedback[playerId] = { correct: false, close: false, points: 0 }
    next.guesses.push(guessNote(next, player, text, 'miss', 0))
    return { ok: true, room: next }
  }
  const started = next.roundStartedAt ?? now
  const ends = next.roundEndsAt ?? now
  const points = pointsForGuess(now - started, Math.max(1, ends - started), false)
  const scorer = next.players.find((item) => item.id === playerId)
  if (scorer) scorer.score += points
  next.solvedIds.push(playerId)
  next.feedback[playerId] = { correct: true, close: false, points }
  next.guesses.push(guessNote(next, player, text, 'correct', points))
  return { ok: true, room: syncPhase(next, now) }
}

function guessNote(
  room: Room,
  player: Player,
  text: string,
  kind: SharedGuess['kind'],
  points: number,
): SharedGuess {
  return {
    id: String(room.guesses.length + 1),
    playerId: player.id,
    nickname: player.nickname,
    text,
    kind,
    points,
  }
}

export function revealIfDue(room: Room, now: number): Room {
  if (room.phase !== 'playing') return room
  if (room.roundEndsAt === null || now < room.roundEndsAt) return room
  const next = structuredClone(room)
  next.phase = 'reveal'
  return next
}

export function syncPhase(room: Room, now: number): Room {
  const timed = revealIfDue(room, now)
  if (timed.phase !== 'playing') return timed
  if (timed.solvedIds.length === 0) return timed
  const next = structuredClone(timed)
  next.phase = 'reveal'
  return next
}

export function advance(
  room: Room,
  playerId: string,
  now: number,
  graceSeconds: number,
): RoomResult {
  if (room.hostId !== playerId) return { ok: false, error: 'Only the host can do that' }
  if (room.phase !== 'reveal') return { ok: false, error: 'Wait for the reveal' }
  const next = structuredClone(room)
  const upcoming = room.roundIndex + 1
  if (upcoming >= room.songs.length) {
    next.phase = 'done'
    return { ok: true, room: next }
  }
  next.roundIndex = upcoming
  next.phase = 'playing'
  next.solvedIds = []
  next.guesses = []
  next.feedback = {}
  const duration = roundDurationMs(next.clipSeconds, graceSeconds)
  next.roundStartedAt = now
  next.roundEndsAt = now + duration
  return { ok: true, room: next }
}

export function restart(room: Room, playerId: string): RoomResult {
  if (room.hostId !== playerId) return { ok: false, error: 'Only the host can do that' }
  if (room.phase !== 'done') return { ok: false, error: 'Finish the set first' }
  const next = structuredClone(room)
  next.phase = 'lobby'
  next.songs = []
  next.roundIndex = -1
  next.roundStartedAt = null
  next.roundEndsAt = null
  next.solvedIds = []
  next.guesses = []
  next.feedback = {}
  next.starting = false
  for (const player of next.players) player.score = 0
  return { ok: true, room: next }
}

export function setConnected(room: Room, playerId: string, connected: boolean, now: number): Room {
  const next = structuredClone(room)
  const player = next.players.find((item) => item.id === playerId)
  if (!player) return next
  player.connected = connected
  return syncPhase(next, now)
}

export function leaveRoom(room: Room, playerId: string, now: number): Room | null {
  const next = structuredClone(room)
  next.players = next.players.filter((player) => player.id !== playerId)
  if (next.players.length === 0) return null
  if (next.hostId === playerId) {
    const connected = next.players.find((player) => player.connected) ?? next.players[0]
    next.hostId = connected.id
  }
  next.solvedIds = next.solvedIds.filter((id) => id !== playerId)
  delete next.feedback[playerId]
  return syncPhase(next, now)
}

export function toView(room: Room, playerId: string): RoomView | null {
  const you = room.players.find((player) => player.id === playerId)
  if (!you) return null
  const song = room.roundIndex >= 0 ? room.songs[room.roundIndex] : undefined
  const showClip = room.phase === 'playing' && song ? { previewUrl: song.previewUrl } : null
  const answerVisible = room.phase === 'reveal' || room.phase === 'done'
  const showReveal =
    answerVisible && song
      ? { title: song.title, artist: song.artist, storeUrl: song.storeUrl }
      : null
  const youSolved = room.solvedIds.includes(you.id)
  const artworkUrl =
    song?.artworkUrl && (answerVisible || (room.phase === 'playing' && youSolved))
      ? song.artworkUrl
      : null
  return {
    code: room.code,
    mode: room.mode,
    phase: room.phase,
    playlistId: room.playlistId,
    playlistName: room.playlistName,
    clipSeconds: room.clipSeconds,
    roundNumber: room.roundIndex >= 0 ? room.roundIndex + 1 : 0,
    totalRounds: room.songs.length,
    you: { id: you.id, isHost: room.hostId === you.id, nickname: you.nickname },
    players: room.players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      score: player.score,
      solved: room.solvedIds.includes(player.id),
      connected: player.connected,
    })),
    clip: showClip,
    reveal: showReveal,
    artworkUrl,
    guesses: room.phase === 'playing' || room.phase === 'reveal' ? room.guesses : [],
    lastGuess: room.feedback[playerId] ?? null,
    roundEndsAt: room.phase === 'playing' ? room.roundEndsAt : null,
    starting: room.starting,
  }
}

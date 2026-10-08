import { MAX_PLAYERS } from './constants'
import { clampClipSeconds } from './clip'
import { judgeArtist, judgeGuess } from './guess'
import { allowsArtistGuess } from './playlist-rules'
import type { AnswerMode, GuessFeedback, RoomView, RoundRecap, SetlistEntry, SharedGuess } from './protocol'
import { clampRoundCount } from './rounds'
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
  answer: AnswerMode
  hostId: string
  playlistId: string
  playlistName: string
  clipSeconds: number
  roundCount: number
  players: Player[]
  phase: RoomView['phase']
  roundIndex: number
  songs: RoundSong[]
  roundStartedAt: number | null
  roundEndsAt: number | null
  solvedIds: string[]
  artistIds: string[]
  guesses: SharedGuess[]
  history: RoundRecap[]
  feedback: Record<string, GuessFeedback>
  starting: boolean
}

export type RoomResult = { ok: true; room: Room } | { ok: false; error: string; room?: Room }

export function createRoom(input: {
  code: string
  hostId: string
  nickname: string
  playlistId: string
  playlistName: string
  clipSeconds: number
  roundCount: number
  mode: 'solo' | 'room'
  answer: AnswerMode
}): Room {
  return {
    code: input.code,
    mode: input.mode,
    answer: allowsArtistGuess(input.playlistId) ? input.answer : 'song',
    hostId: input.hostId,
    playlistId: input.playlistId,
    playlistName: input.playlistName,
    clipSeconds: clampClipSeconds(input.clipSeconds),
    roundCount: clampRoundCount(input.roundCount),
    players: [
      { id: input.hostId, nickname: input.nickname, score: 0, connected: true },
    ],
    phase: 'lobby',
    roundIndex: -1,
    songs: [],
    roundStartedAt: null,
    roundEndsAt: null,
    solvedIds: [],
    artistIds: [],
    guesses: [],
    history: [],
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
  roundCount: number,
  answer: AnswerMode,
): RoomResult {
  if (room.hostId !== playerId) return { ok: false, error: 'Only the host can do that' }
  if (room.phase !== 'lobby' || room.starting) {
    return { ok: false, error: 'You can only change settings in the lobby' }
  }
  const next = structuredClone(room)
  next.playlistId = playlistId
  next.playlistName = playlistName
  next.clipSeconds = clampClipSeconds(clipSeconds)
  next.roundCount = clampRoundCount(roundCount)
  next.answer = allowsArtistGuess(playlistId) ? answer : 'song'
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
  next.artistIds = []
  next.guesses = []
  next.history = []
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
    return { ok: false, error: 'That round just ended', room: syncPhase(room, now) }
  }
  const player = room.players.find((item) => item.id === playerId)
  if (!player) return { ok: false, error: 'You are not in this room' }
  if (room.solvedIds.includes(playerId)) return { ok: false, error: 'You already have this one' }
  const song = room.songs[room.roundIndex]
  if (!song) return { ok: false, error: 'No song in this round' }
  const next = structuredClone(room)
  const titleJudgement = judgeGuess(text, song.title, song.aliases)
  const artistJudgement = judgeArtist(text, song.artist)
  const artistCounts = allowsArtistGuess(next.playlistId)
  if (next.answer === 'artist' && artistCounts) {
    return { ok: true, room: scoreArtistRound(next, player, text, now, titleJudgement, artistJudgement) }
  }
  if (titleJudgement === 'correct') {
    const points = awardPoints(next, playerId, now, 'title')
    next.solvedIds.push(playerId)
    next.feedback[playerId] = { correct: true, close: false, artist: false, song: false, points }
    next.guesses.push(guessNote(next, player, text, 'correct', points))
    return { ok: true, room: syncPhase(next, now) }
  }
  if (!artistCounts && artistJudgement === 'correct' && titleJudgement !== 'close') {
    next.feedback[playerId] = { correct: false, close: false, artist: true, song: true, points: 0 }
    next.guesses.push(guessNote(next, player, text, 'miss', 0))
    return { ok: true, room: next }
  }
  if (artistCounts && artistJudgement === 'correct') {
    if (next.artistIds.includes(playerId)) {
      next.feedback[playerId] = { correct: false, close: false, artist: true, song: false, points: 0 }
      next.guesses.push(guessNote(next, player, text, 'artist', 0))
      return { ok: true, room: next }
    }
    const points = awardPoints(next, playerId, now, 'artist')
    next.artistIds.push(playerId)
    next.feedback[playerId] = { correct: false, close: false, artist: true, song: false, points }
    next.guesses.push(guessNote(next, player, text, 'artist', points))
    return { ok: true, room: next }
  }
  if (titleJudgement === 'close' || (artistCounts && artistJudgement === 'close')) {
    next.feedback[playerId] = { correct: false, close: true, artist: false, song: false, points: 0 }
    next.guesses.push(guessNote(next, player, text, 'close', 0))
    return { ok: true, room: next }
  }
  next.feedback[playerId] = { correct: false, close: false, artist: false, song: false, points: 0 }
  next.guesses.push(guessNote(next, player, text, 'miss', 0))
  return { ok: true, room: next }
}

function scoreArtistRound(
  room: Room,
  player: Player,
  text: string,
  now: number,
  titleJudgement: ReturnType<typeof judgeGuess>,
  artistJudgement: ReturnType<typeof judgeArtist>,
): Room {
  if (artistJudgement === 'correct') {
    const points = awardPoints(room, player.id, now, 'title')
    room.solvedIds.push(player.id)
    room.feedback[player.id] = { correct: true, close: false, artist: true, song: false, points }
    room.guesses.push(guessNote(room, player, text, 'correct', points))
    return syncPhase(room, now)
  }
  if (titleJudgement === 'correct') {
    room.feedback[player.id] = { correct: false, close: false, artist: false, song: true, points: 0 }
    room.guesses.push(guessNote(room, player, text, 'song', 0))
    return room
  }
  if (artistJudgement === 'close') {
    room.feedback[player.id] = { correct: false, close: true, artist: false, song: false, points: 0 }
    room.guesses.push(guessNote(room, player, text, 'close', 0))
    return room
  }
  room.feedback[player.id] = { correct: false, close: false, artist: false, song: false, points: 0 }
  room.guesses.push(guessNote(room, player, text, 'miss', 0))
  return room
}

function awardPoints(room: Room, playerId: string, now: number, reason: 'title' | 'artist'): number {
  const started = room.roundStartedAt ?? now
  const ends = room.roundEndsAt ?? now
  const points = pointsForGuess(now - started, Math.max(1, ends - started), reason)
  const scorer = room.players.find((item) => item.id === playerId)
  if (scorer) scorer.score += points
  return points
}

function snapshotRound(room: Room): RoundRecap | null {
  const song = room.songs[room.roundIndex]
  if (!song) return null
  const scores: RoundRecap['scores'] = []
  for (const guess of room.guesses) {
    if (guess.points <= 0) continue
    if (guess.kind !== 'correct' && guess.kind !== 'artist') continue
    scores.push({ nickname: guess.nickname, points: guess.points, kind: guess.kind })
  }
  return {
    title: song.title,
    artist: song.artist,
    storeUrl: song.storeUrl,
    scores,
  }
}

function toSetlist(history: readonly RoundRecap[]): SetlistEntry[] {
  return history.map((round) => {
    const guessedBy = round.scores.filter((score) => score.kind === 'correct').map((score) => score.nickname)
    return {
      title: round.title,
      artist: round.artist,
      storeUrl: round.storeUrl,
      guessed: guessedBy.length > 0,
      guessedBy,
    }
  })
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
  fromRound = 0,
): RoomResult {
  if (room.hostId !== playerId) return { ok: false, error: 'Only the host can do that' }
  const currentRound = room.roundIndex >= 0 ? room.roundIndex + 1 : 0
  if (fromRound > 0 && fromRound !== currentRound) return { ok: true, room }
  if (room.phase !== 'reveal') {
    if (fromRound > 0 && room.phase === 'done') return { ok: true, room }
    return { ok: false, error: 'Wait for the reveal' }
  }
  const next = structuredClone(room)
  const recorded = snapshotRound(room)
  if (recorded) next.history.push(recorded)
  const upcoming = room.roundIndex + 1
  if (upcoming >= room.songs.length) {
    next.phase = 'done'
    return { ok: true, room: next }
  }
  next.roundIndex = upcoming
  next.phase = 'playing'
  next.solvedIds = []
  next.artistIds = []
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
  next.artistIds = []
  next.guesses = []
  next.history = []
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
  next.artistIds = next.artistIds.filter((id) => id !== playerId)
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
      ? { title: song.title, artist: song.artist, storeUrl: song.storeUrl, trackId: song.trackId }
      : null
  const youSolved = room.solvedIds.includes(you.id)
  const artworkUrl =
    song?.artworkUrl && (answerVisible || (room.phase === 'playing' && youSolved))
      ? song.artworkUrl
      : null
  return {
    code: room.code,
    mode: room.mode,
    answer: room.answer,
    phase: room.phase,
    playlistId: room.playlistId,
    playlistName: room.playlistName,
    clipSeconds: room.clipSeconds,
    roundCount: room.roundCount,
    roundNumber: room.roundIndex >= 0 ? room.roundIndex + 1 : 0,
    totalRounds: room.songs.length,
    setlist: room.phase === 'done' ? toSetlist(room.history) : [],
    you: { id: you.id, isHost: room.hostId === you.id, nickname: you.nickname },
    players: room.players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      score: player.score,
      solved: room.solvedIds.includes(player.id),
      namedArtist: room.artistIds.includes(player.id),
      connected: player.connected,
    })),
    clip: showClip,
    reveal: showReveal,
    artworkUrl,
    guesses: room.phase === 'playing' || room.phase === 'reveal' ? room.guesses : [],
    recap:
      room.phase === 'done'
        ? room.history.map((round) => ({
            title: round.title,
            artist: round.artist,
            storeUrl: round.storeUrl,
            scores: round.scores.map((score) => ({ ...score })),
          }))
        : [],
    lastGuess: room.feedback[playerId] ?? null,
    roundEndsAt: room.phase === 'playing' ? room.roundEndsAt : null,
    starting: room.starting,
  }
}

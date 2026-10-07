import { getPlaylist } from '@/catalog/registry'
import { assertNever } from '@/game/assert-never'
import { makeCode, makeId } from '@/game/ids'
import { cleanCode, cleanNickname } from '@/game/names'
import {
  parseClientMessage,
  type ClientMessage,
  type ServerMessage,
} from '@/game/protocol'
import {
  abortStarting,
  advance,
  beginGame,
  configureRoom,
  createRoom,
  joinRoom,
  leaveRoom,
  markStarting,
  restart,
  setConnected,
  submitGuess,
  syncPhase,
  toView,
  type Room,
} from '@/game/room'
import { guessGraceSeconds } from '@/game/score'
import { loadRoundSongs, previewOptionsFromEnv } from '@/server/previews'

export type SocketLike = {
  readyState: number
  send: (data: string) => void
  on: (event: 'message' | 'close' | 'error', listener: (data: unknown) => void) => void
}

type Client = {
  socket: SocketLike
  playerId: string | null
  code: string | null
}

const rooms = new Map<string, Room>()
const clientsByRoom = new Map<string, Set<Client>>()
let ticking = false

export function resetHub(): void {
  rooms.clear()
  clientsByRoom.clear()
}

export function startTicking(): void {
  if (ticking) return
  ticking = true
  setInterval(() => {
    tick(Date.now())
  }, 400)
}

export function tick(now: number): void {
  for (const [code, room] of rooms) {
    const next = syncPhase(room, now)
    if (next === room) continue
    rooms.set(code, next)
    broadcast(code)
  }
}

export function handleSocket(socket: SocketLike): void {
  const client: Client = { socket, playerId: null, code: null }
  socket.on('message', (data) => {
    void onMessage(client, textOf(data))
  })
  socket.on('close', () => {
    onClose(client)
  })
  socket.on('error', () => {
    onClose(client)
  })
}

async function onMessage(client: Client, text: string): Promise<void> {
  if (text.length > 4000) return
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    return
  }
  const message = parseClientMessage(parsed)
  if (!message) return
  switch (message.type) {
    case 'create':
      onCreate(client, message)
      return
    case 'join':
      onJoin(client, message)
      return
    case 'resume':
      onResume(client, message)
      return
    case 'configure':
      onConfigure(client, message)
      return
    case 'start':
      await onStart(client, message.avoidTrackIds)
      return
    case 'guess':
      onGuess(client, message.text)
      return
    case 'next':
      onNext(client)
      return
    case 'restart':
      onRestart(client)
      return
    case 'leave':
      onLeave(client)
      return
    default:
      assertNever(message)
  }
}

function onCreate(client: Client, message: Extract<ClientMessage, { type: 'create' }>): void {
  const nickname = cleanNickname(message.nickname)
  if (!nickname) {
    fail(client, 'Use 2–16 letters or numbers')
    return
  }
  const playlist = getPlaylist(message.playlistId)
  if (!playlist) {
    fail(client, 'Unknown playlist')
    return
  }
  detach(client)
  const playerId = makeId()
  const room = createRoom({
    code: freshCode(),
    hostId: playerId,
    nickname,
    playlistId: playlist.id,
    playlistName: playlist.name,
    clipSeconds: message.clipSeconds,
    mode: message.mode,
  })
  rooms.set(room.code, room)
  attach(client, room.code, playerId)
  broadcast(room.code)
}

function onJoin(client: Client, message: Extract<ClientMessage, { type: 'join' }>): void {
  const nickname = cleanNickname(message.nickname)
  const code = cleanCode(message.code)
  if (!nickname) {
    fail(client, 'Use 2–16 letters or numbers')
    return
  }
  if (!code) {
    fail(client, 'That room code is not valid')
    return
  }
  const room = rooms.get(code)
  if (!room) {
    fail(client, 'No room with that code')
    return
  }
  const playerId = makeId()
  const joined = joinRoom(room, { id: playerId, nickname })
  if (!joined.ok) {
    fail(client, joined.error)
    return
  }
  detach(client)
  rooms.set(code, joined.room)
  attach(client, code, playerId)
  broadcast(code)
}

function onResume(client: Client, message: Extract<ClientMessage, { type: 'resume' }>): void {
  const code = cleanCode(message.code)
  const room = code ? rooms.get(code) : undefined
  const player = room?.players.find((item) => item.id === message.playerId)
  if (!room || !player || !code) {
    fail(client, 'That room is gone')
    return
  }
  detach(client)
  attach(client, code, player.id)
  broadcast(code)
}

function onConfigure(
  client: Client,
  message: Extract<ClientMessage, { type: 'configure' }>,
): void {
  const located = locate(client)
  if (!located) return
  const playlist = getPlaylist(message.playlistId)
  if (!playlist) {
    fail(client, 'Unknown playlist')
    return
  }
  const configured = configureRoom(
    located.room,
    located.playerId,
    playlist.id,
    playlist.name,
    message.clipSeconds,
  )
  if (!configured.ok) {
    fail(client, configured.error)
    return
  }
  rooms.set(located.room.code, configured.room)
  broadcast(located.room.code)
}

async function onStart(client: Client, avoidTrackIds: readonly number[]): Promise<void> {
  const located = locate(client)
  if (!located) return
  const marked = markStarting(located.room, located.playerId)
  if (!marked.ok) {
    fail(client, marked.error)
    return
  }
  rooms.set(located.room.code, marked.room)
  broadcast(located.room.code)
  const playlist = getPlaylist(marked.room.playlistId)
  if (!playlist) {
    rooms.set(located.room.code, abortStarting(marked.room))
    broadcast(located.room.code)
    fail(client, 'Unknown playlist')
    return
  }
  try {
    const songs = await loadRoundSongs(playlist, previewOptionsFromEnv(), avoidTrackIds)
    const current = rooms.get(located.room.code)
    if (!current || !current.starting) return
    if (songs.length === 0) {
      rooms.set(current.code, abortStarting(current))
      broadcast(current.code)
      fail(client, 'No previews for that playlist')
      return
    }
    const begun = beginGame(current, songs, Date.now(), guessGraceSeconds())
    if (!begun.ok) {
      rooms.set(current.code, abortStarting(current))
      broadcast(current.code)
      fail(client, begun.error)
      return
    }
    rooms.set(current.code, begun.room)
    broadcast(current.code)
  } catch (error) {
    const current = rooms.get(located.room.code)
    if (current?.starting) {
      rooms.set(current.code, abortStarting(current))
      broadcast(current.code)
    }
    const message = error instanceof Error ? error.message : 'Could not load previews'
    fail(client, message)
  }
}

function onGuess(client: Client, text: string): void {
  const located = locate(client)
  if (!located) return
  const guessed = submitGuess(located.room, located.playerId, text, Date.now())
  if (!guessed.ok) {
    fail(client, guessed.error)
    return
  }
  rooms.set(located.room.code, guessed.room)
  broadcast(located.room.code)
}

function onNext(client: Client): void {
  const located = locate(client)
  if (!located) return
  const stepped = advance(located.room, located.playerId, Date.now(), guessGraceSeconds())
  if (!stepped.ok) {
    fail(client, stepped.error)
    return
  }
  rooms.set(located.room.code, stepped.room)
  broadcast(located.room.code)
}

function onRestart(client: Client): void {
  const located = locate(client)
  if (!located) return
  const restarted = restart(located.room, located.playerId)
  if (!restarted.ok) {
    fail(client, restarted.error)
    return
  }
  rooms.set(located.room.code, restarted.room)
  broadcast(located.room.code)
}

function onLeave(client: Client): void {
  const code = client.code
  const playerId = client.playerId
  detach(client)
  send(client, { type: 'left' })
  if (!code || !playerId) return
  const room = rooms.get(code)
  if (!room) return
  const next = leaveRoom(room, playerId, Date.now())
  if (!next) {
    rooms.delete(code)
    clientsByRoom.delete(code)
    return
  }
  rooms.set(code, next)
  broadcast(code)
}

function onClose(client: Client): void {
  const code = client.code
  const playerId = client.playerId
  if (code) clientsByRoom.get(code)?.delete(client)
  client.code = null
  client.playerId = null
  if (!code || !playerId) return
  const room = rooms.get(code)
  if (!room) return
  const stillThere = [...(clientsByRoom.get(code) ?? [])].some((item) => item.playerId === playerId)
  if (stillThere) return
  rooms.set(code, setConnected(room, playerId, false, Date.now()))
  broadcast(code)
}

function locate(client: Client): { room: Room; playerId: string } | null {
  if (!client.code || !client.playerId) {
    fail(client, 'Join a room first')
    return null
  }
  const room = rooms.get(client.code)
  if (!room) {
    fail(client, 'That room is gone')
    return null
  }
  return { room, playerId: client.playerId }
}

function attach(client: Client, code: string, playerId: string): void {
  client.code = code
  client.playerId = playerId
  let bucket = clientsByRoom.get(code)
  if (!bucket) {
    bucket = new Set()
    clientsByRoom.set(code, bucket)
  }
  bucket.add(client)
  const room = rooms.get(code)
  if (!room) return
  rooms.set(code, setConnected(room, playerId, true, Date.now()))
}

function detach(client: Client): void {
  if (!client.code) return
  clientsByRoom.get(client.code)?.delete(client)
  client.code = null
  client.playerId = null
}

function freshCode(): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = makeCode()
    if (!rooms.has(code)) return code
  }
  return makeCode()
}

function broadcast(code: string): void {
  const room = rooms.get(code)
  const bucket = clientsByRoom.get(code)
  if (!room || !bucket) return
  for (const client of bucket) {
    if (!client.playerId) continue
    const view = toView(room, client.playerId)
    if (!view) continue
    send(client, { type: 'snapshot', playerId: client.playerId, view })
  }
}

function fail(client: Client, message: string): void {
  send(client, { type: 'error', message })
}

function send(client: Client, message: ServerMessage): void {
  if (client.socket.readyState !== 1) return
  client.socket.send(JSON.stringify(message))
}

function textOf(data: unknown): string {
  if (typeof data === 'string') return data
  if (data instanceof Uint8Array) return Buffer.from(data).toString('utf8')
  if (Array.isArray(data)) {
    const parts = data.filter((part): part is Uint8Array => part instanceof Uint8Array)
    return Buffer.concat(parts).toString('utf8')
  }
  return ''
}

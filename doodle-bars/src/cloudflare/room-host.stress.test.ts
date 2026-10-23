import { beforeEach, expect, it, vi } from 'vitest'
import { MAX_PLAYERS } from '@/game/constants'
import { makeCode, makeId } from '@/game/ids'
import type { RoomView, ServerMessage } from '@/game/protocol'
import { REAP_MS, type ConnParams, type GameRoomInput, type GameRoomState } from '@/game/room-service'
import { clearPreviewCache } from '@/server/previews'
import { RoomHost, type RoomConn, type RoomPlatform } from './room-host'
import type { WireRequest } from './wire'

const T0 = 1_700_000_000_000

beforeEach(() => {
  clearPreviewCache()
  process.env.GUESS_GRACE_SECONDS = '2'
})

type FakeConn = RoomConn & { inbox: ServerMessage[] }

function makeRuntime(saved: GameRoomState | null = null) {
  const runtime = {
    clock: T0,
    sockets: [] as FakeConn[],
    saved,
    alarm: null as number | null,
    wiped: false,
    host: null as unknown as RoomHost,
  }
  const platform: RoomPlatform = {
    now: () => runtime.clock,
    conns: () => runtime.sockets,
    save: (state) => {
      runtime.saved = structuredClone(state)
    },
    wipe: async () => {
      runtime.wiped = true
      runtime.saved = null
      runtime.alarm = null
      runtime.sockets = []
    },
    setAlarm: (at) => {
      runtime.alarm = at
    },
    previewOptions: () => ({ mode: 'fixture', order: 'catalog' }),
  }
  runtime.host = new RoomHost(platform, saved)
  return runtime
}

type Runtime = ReturnType<typeof makeRuntime>

function view(conn: FakeConn): RoomView {
  const snapshot = conn.inbox.findLast((message) => message.type === 'snapshot')
  if (!snapshot || snapshot.type !== 'snapshot') throw new Error('no snapshot')
  return snapshot.view
}

async function open(runtime: Runtime, playerId: string, intent: ConnParams['intent']): Promise<FakeConn | null> {
  const inbox: ServerMessage[] = []
  const conn: FakeConn = { id: makeId(), playerId, inbox, send: (message) => inbox.push(message) }
  if (!runtime.host.admit(conn, { playerId, intent })) return null
  runtime.sockets.push(conn)
  await runtime.host.connect(conn)
  return conn
}

async function close(runtime: Runtime, conn: FakeConn): Promise<void> {
  runtime.sockets = runtime.sockets.filter((other) => other.id !== conn.id)
  await runtime.host.disconnect(conn)
}

async function send(runtime: Runtime, conn: FakeConn, request: WireRequest): Promise<void> {
  await runtime.host.message(conn, request)
}

function input(code: string, hostId: string, extra?: Partial<GameRoomInput>): GameRoomInput {
  return {
    code,
    hostId,
    nickname: 'Aman',
    playlistId: 'hindi',
    clipSeconds: 1,
    roundCount: 2,
    mode: 'room',
    answer: 'song',
    ...extra,
  }
}

async function seatedRoom() {
  const runtime = makeRuntime()
  const code = makeCode()
  const hostId = makeId()
  expect(await runtime.host.create(input(code, hostId), code)).toEqual({ ok: true })
  const host = await open(runtime, hostId, 'resume')
  if (!host) throw new Error('host')
  const guests: FakeConn[] = []
  for (const nickname of ['Riya', 'Dev']) {
    const playerId = makeId()
    const guest = await open(runtime, playerId, 'join')
    if (!guest) throw new Error(nickname)
    await send(runtime, guest, { type: 'join', nickname })
    guests.push(guest)
  }
  return { runtime, code, hostId, host, guests }
}

it('seats a full room, rejects one more, and keeps every guess', async () => {
  const runtime = makeRuntime()
  const code = makeCode()
  const hostId = makeId()
  expect(await runtime.host.create(input(code, hostId), code)).toEqual({ ok: true })
  const host = await open(runtime, hostId, 'resume')
  if (!host) throw new Error('host')
  const guests: FakeConn[] = []
  for (let index = 0; index < MAX_PLAYERS - 1; index += 1) {
    const guest = await open(runtime, makeId(), 'join')
    if (!guest) throw new Error('guest')
    await send(runtime, guest, { type: 'join', nickname: `G${index}` })
    guests.push(guest)
  }
  expect(view(host).players).toHaveLength(MAX_PLAYERS)
  const extra = await open(runtime, makeId(), 'join')
  if (!extra) throw new Error('extra')
  await send(runtime, extra, { type: 'join', nickname: 'Extra' })
  expect(extra.inbox.some((message) => message.type === 'error' && message.message === 'That room is full')).toBe(true)
  expect(view(host).players).toHaveLength(MAX_PLAYERS)

  await send(runtime, host, { type: 'start', msgId: makeId(), avoidTrackIds: [] })
  expect(view(host).phase).toBe('playing')
  const clocks = [host, ...guests].map((conn) => view(conn).clipStartsAt)
  expect(new Set(clocks).size).toBe(1)

  // A Durable Object delivers the next WebSocket message after the storage write finishes.
  // The live Worker battle sends these together; this host stands in for that serialization.
  for (const [index, guest] of guests.entries()) {
    await send(runtime, guest, { type: 'guess', msgId: makeId(), text: `miss-${index}` })
  }
  const texts = view(host).guesses.map((guess) => guess.text).sort()
  expect(texts).toEqual(guests.map((_, index) => `miss-${index}`).sort())
  for (const guest of guests) {
    expect(view(guest).guesses.map((guess) => guess.text).sort()).toEqual(texts)
    expect(view(guest).phase).toBe('playing')
  }
})

it('replays the same guess once and still reveals after every socket drops', async () => {
  const { runtime, host, guests } = await seatedRoom()
  await send(runtime, host, { type: 'start', msgId: makeId(), avoidTrackIds: [] })
  const msgId = makeId()
  await send(runtime, guests[0]!, { type: 'guess', msgId, text: 'nope' })
  await send(runtime, guests[0]!, { type: 'guess', msgId, text: 'nope' })
  expect(view(host).guesses).toHaveLength(1)

  const endsAt = runtime.alarm
  expect(endsAt).toBe(runtime.saved?.room.roundEndsAt)
  for (const conn of [host, ...guests]) await close(runtime, conn)
  runtime.clock = (endsAt ?? 0) + 1
  await runtime.host.alarm()
  expect(runtime.saved?.room.phase).toBe('reveal')
  // Idle time starts when the last socket closed, which was still T0.
  expect(runtime.alarm).toBe(T0 + REAP_MS)

  const back = await open(runtime, host.playerId, 'resume')
  if (!back) throw new Error('resume')
  expect(view(back).phase).toBe('reveal')
  expect(view(back).reveal?.title).toBe('Kesariya')
  expect(view(back).guesses.map((guess) => guess.text)).toEqual(['nope'])
})

it('returns a dropped seat to the same round and lets the new host continue', async () => {
  const { runtime, host, guests } = await seatedRoom()
  await send(runtime, host, { type: 'start', msgId: makeId(), avoidTrackIds: [] })
  await close(runtime, host)
  expect(view(guests[0]!).players.find((player) => player.id === host.playerId)?.connected).toBe(false)

  const resumed = await open(runtime, host.playerId, 'resume')
  if (!resumed) throw new Error('resume')
  expect(view(resumed).phase).toBe('playing')
  expect(view(resumed).clipStartsAt).toBe(view(guests[1]!).clipStartsAt)

  await send(runtime, guests[1]!, { type: 'guess', msgId: makeId(), text: 'Kesariya' })
  expect(view(resumed).phase).toBe('reveal')
  expect(view(guests[0]!).phase).toBe('reveal')

  await send(runtime, resumed, { type: 'leave' })
  expect(view(guests[0]!).you.isHost || view(guests[1]!).you.isHost).toBe(true)
  const nextHost = view(guests[0]!).you.isHost ? guests[0]! : guests[1]!
  await send(runtime, nextHost, { type: 'next', msgId: makeId(), roundNumber: 1 })
  expect(view(nextHost).phase).toBe('playing')
  expect(view(nextHost).roundNumber).toBe(2)
  expect(view(guests[0]!).clipStartsAt).toBe(view(guests[1]!).clipStartsAt)
})

it('reveals a guess that lands on the deadline and does not attach an error', async () => {
  const { runtime, host, guests } = await seatedRoom()
  await send(runtime, host, { type: 'start', msgId: makeId(), avoidTrackIds: [] })
  runtime.clock = (runtime.saved?.room.roundEndsAt ?? 0) + 1
  await send(runtime, guests[0]!, { type: 'guess', msgId: makeId(), text: 'Kesariya' })
  expect(view(host).phase).toBe('reveal')
  expect(view(guests[0]!).phase).toBe('reveal')
  expect(view(host).reveal?.title).toBe('Kesariya')
  expect(guests[0]!.inbox.some((message) => message.type === 'error')).toBe(false)
  expect(host.inbox.some((message) => message.type === 'error')).toBe(false)
})

it('does not stay stuck when the song lookup is abandoned', async () => {
  const pending = new Promise<never>(() => {})
  const runtime = makeRuntime()
  const code = makeCode()
  const hostId = makeId()
  const hung = new RoomHost(
    {
      now: () => T0,
      conns: () => [],
      save: (state) => {
        runtime.saved = state
      },
      wipe: async () => {},
      setAlarm: () => {},
      previewOptions: () => ({ mode: 'live', order: 'catalog', fetchImpl: () => pending }),
    },
    null,
  )
  expect(await hung.create(input(code, hostId, { mode: 'solo' }), code)).toEqual({ ok: true })
  const inbox: ServerMessage[] = []
  const conn: FakeConn = { id: 'c', playerId: hostId, inbox, send: (message) => inbox.push(message) }
  expect(hung.admit(conn, { playerId: hostId, intent: 'resume' })).toBe(true)
  await hung.connect(conn)
  const starting = hung.message(conn, { type: 'start', msgId: 'start-1', avoidTrackIds: [] })
  await vi.waitFor(() => expect(runtime.saved?.room.starting).toBe(true))

  const woke = makeRuntime(runtime.saved)
  await woke.host.wake()
  expect(woke.saved?.room.starting).toBe(false)
  expect(woke.saved?.room.phase).toBe('lobby')
  void starting
})

it('plays four rooms at once without mixing their guesses', async () => {
  const rooms = await Promise.all(Array.from({ length: 4 }, () => seatedRoom()))
  await Promise.all(rooms.map(({ runtime, host }) => send(runtime, host, { type: 'start', msgId: makeId(), avoidTrackIds: [] })))
  await Promise.all(
    rooms.map(({ runtime, guests }, index) =>
      send(runtime, guests[0]!, { type: 'guess', msgId: makeId(), text: `room-${index}` }),
    ),
  )
  for (const [index, room] of rooms.entries()) {
    expect(view(room.host).code).toBe(room.code)
    expect(view(room.host).guesses.map((guess) => guess.text)).toEqual([`room-${index}`])
    expect(view(room.guests[1]!).guesses.map((guess) => guess.text)).toEqual([`room-${index}`])
    expect(view(room.host).phase).toBe('playing')
  }
})

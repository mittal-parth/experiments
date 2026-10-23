import { beforeEach, expect, it, vi } from 'vitest'
import { makeCode, makeId } from '@/game/ids'
import type { RoomView, ServerMessage } from '@/game/protocol'
import { REAP_MS, type ConnParams, type GameRoomInput, type GameRoomState } from '@/game/room-service'
import { MISSING_ROOM } from '@/rivet/errors'
import { clearPreviewCache } from '@/server/previews'
import { RoomHost, type RoomConn, type RoomPlatform } from './room-host'
import type { WireRequest } from './wire'

const T0 = 1_700_000_000_000

beforeEach(() => {
  clearPreviewCache()
  process.env.GUESS_GRACE_SECONDS = '45'
})

type FakeConn = RoomConn & { inbox: ServerMessage[] }

/** A stand-in for the Durable Object: in-memory storage, a manual clock, and a list of sockets. */
function makeRuntime(saved: GameRoomState | null = null, previewOptions: RoomPlatform['previewOptions'] = fixtureOptions) {
  const runtime = {
    clock: T0,
    sockets: [] as FakeConn[],
    saved,
    alarm: null as number | null,
    alarmWrites: 0,
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
      runtime.alarmWrites += 1
    },
    previewOptions,
  }
  runtime.host = new RoomHost(platform, saved)
  return runtime
}

type Runtime = ReturnType<typeof makeRuntime>

function fixtureOptions() {
  return { mode: 'fixture' as const, order: 'catalog' as const }
}

function hostInput(code: string, hostId: string, extra?: Partial<GameRoomInput>): GameRoomInput {
  return {
    code,
    hostId,
    nickname: 'Aman',
    playlistId: 'hindi',
    clipSeconds: 3,
    roundCount: 1,
    mode: 'solo',
    answer: 'song',
    ...extra,
  }
}

function open(runtime: Runtime, playerId: string, intent: ConnParams['intent']): FakeConn | null {
  const inbox: ServerMessage[] = []
  const conn: FakeConn = { id: makeId(), playerId, inbox, send: (message) => inbox.push(message) }
  if (!runtime.host.admit(conn, { playerId, intent })) return null
  runtime.sockets.push(conn)
  runtime.host.connect(conn)
  return conn
}

function close(runtime: Runtime, conn: FakeConn): void {
  runtime.sockets = runtime.sockets.filter((other) => other.id !== conn.id)
  runtime.host.disconnect(conn)
}

function hosted(extra?: Partial<GameRoomInput>) {
  const runtime = makeRuntime()
  const code = makeCode()
  const playerId = makeId()
  expect(runtime.host.create(hostInput(code, playerId, extra), code)).toEqual({ ok: true })
  const conn = open(runtime, playerId, 'resume')
  if (!conn) throw new Error('host could not connect')
  return { runtime, code, playerId, conn }
}

function lastView(conn: FakeConn): RoomView {
  const snapshot = conn.inbox.findLast((message) => message.type === 'snapshot')
  if (!snapshot || snapshot.type !== 'snapshot') throw new Error('no snapshot')
  return snapshot.view
}

function errors(conn: FakeConn): string[] {
  return conn.inbox.flatMap((message) => (message.type === 'error' ? [message.message] : []))
}

function send(runtime: Runtime, conn: FakeConn, request: WireRequest) {
  return runtime.host.message(conn, request)
}

it('has no room until one is created', () => {
  const runtime = makeRuntime()
  expect(runtime.host.exists()).toBe(false)
  const conn: FakeConn = { id: 'a', playerId: 'p', inbox: [], send: (m) => conn.inbox.push(m) }
  expect(runtime.host.admit(conn, { playerId: 'p', intent: 'resume' })).toBe(false)
  expect(conn.inbox).toEqual([{ type: 'error', message: MISSING_ROOM }])
})

it('refuses a second create for a live code and rejects bad input', () => {
  const { runtime, code } = hosted()
  expect(runtime.host.create(hostInput(code, makeId()), code)).toMatchObject({ ok: false, status: 409 })
  const fresh = makeRuntime()
  expect(fresh.host.create(hostInput('ABCD', 'h', { nickname: '!' }), 'ABCD')).toMatchObject({ ok: false, status: 400 })
  expect(fresh.host.create(hostInput('ABCD', 'h', { playlistId: 'nope' }), 'ABCD')).toMatchObject({
    ok: false,
    status: 400,
    message: 'Unknown playlist',
  })
  expect(fresh.host.create(hostInput('??', 'h'), '??')).toMatchObject({ ok: false, status: 400 })
  expect(fresh.host.exists()).toBe(false)
})

it('refuses a resume for a player who has no seat', () => {
  const { runtime } = hosted()
  expect(open(runtime, 'stranger', 'resume')).toBeNull()
})

it('plays a solo round without leaking the title, then reveals on the right guess', async () => {
  const { runtime, conn } = hosted()
  expect(lastView(conn).phase).toBe('lobby')
  await send(runtime, conn, { type: 'start', msgId: makeId(), avoidTrackIds: [] })
  const playing = lastView(conn)
  expect(playing.phase).toBe('playing')
  expect(JSON.stringify(playing)).not.toContain('Kesariya')
  expect(playing.artworkUrl).toBeNull()

  await send(runtime, conn, { type: 'guess', msgId: makeId(), text: 'nope' })
  const missed = lastView(conn)
  expect(missed.lastGuess).toEqual({ correct: false, close: false, artist: false, song: false, points: 0 })
  expect(JSON.stringify(missed)).not.toContain('Kesariya')

  await send(runtime, conn, { type: 'guess', msgId: makeId(), text: 'Kesariya' })
  const revealed = lastView(conn)
  expect(revealed.phase).toBe('reveal')
  expect(revealed.reveal?.title).toBe('Kesariya')
  expect(revealed.reveal?.storeUrl).toContain('music.apple.com')
  expect(revealed.artworkUrl).toBe('/fixture-cover.svg')
  expect(revealed.players[0]?.score).toBeGreaterThan(0)
})

it('loads the number of songs the host asked for', async () => {
  const { runtime, conn } = hosted({ roundCount: 3, clipSeconds: 5 })
  expect(lastView(conn).roundCount).toBe(3)
  await send(runtime, conn, { type: 'start', msgId: makeId(), avoidTrackIds: [] })
  expect(lastView(conn).totalRounds).toBe(3)
  expect(lastView(conn).roundNumber).toBe(1)
})

it('does not score a repeated guess', async () => {
  const { runtime, conn } = hosted()
  await send(runtime, conn, { type: 'start', msgId: makeId(), avoidTrackIds: [] })
  const msgId = makeId()
  await send(runtime, conn, { type: 'guess', msgId, text: 'nope' })
  await send(runtime, conn, { type: 'guess', msgId, text: 'nope' })
  expect(lastView(conn).guesses.length).toBe(1)
  expect(lastView(conn).players[0]?.score).toBe(0)
})

it('tells a stranger to join before finishing', async () => {
  const { runtime } = hosted()
  const stranger = open(runtime, makeId(), 'join')
  if (!stranger) throw new Error('stranger should connect')
  await send(runtime, stranger, { type: 'next', msgId: makeId(), roundNumber: 1 })
  expect(errors(stranger).at(-1)).toBe('Join a room first')
})

it('seats a second player and shows both on every screen', async () => {
  const { runtime, conn } = hosted({ mode: 'room' })
  const guestId = makeId()
  const guest = open(runtime, guestId, 'join')
  if (!guest) throw new Error('guest should connect')
  await send(runtime, guest, { type: 'join', nickname: 'Riya' })
  expect(lastView(conn).players.map((player) => player.nickname)).toEqual(['Aman', 'Riya'])
  expect(lastView(guest).you.nickname).toBe('Riya')

  close(runtime, guest)
  expect(lastView(conn).players.find((player) => player.nickname === 'Riya')?.connected).toBe(false)
  const back = open(runtime, guestId, 'resume')
  expect(back).not.toBeNull()
  expect(lastView(conn).players.find((player) => player.nickname === 'Riya')?.connected).toBe(true)
})

it('keeps a player present while another tab of theirs is open', async () => {
  const { runtime, conn, playerId } = hosted({ mode: 'room' })
  const second = open(runtime, playerId, 'resume')
  if (!second) throw new Error('second tab')
  close(runtime, second)
  expect(lastView(conn).players[0]?.connected).toBe(true)
})

it('lets the same player finish from a second connection', async () => {
  const { runtime, conn, playerId } = hosted()
  await send(runtime, conn, { type: 'start', msgId: makeId(), avoidTrackIds: [] })
  await send(runtime, conn, { type: 'guess', msgId: makeId(), text: 'Kesariya' })
  const roundNumber = lastView(conn).roundNumber
  close(runtime, conn)
  const rebound = open(runtime, playerId, 'resume')
  if (!rebound) throw new Error('resume')
  await send(runtime, rebound, { type: 'next', msgId: makeId(), roundNumber })
  expect(lastView(rebound).phase).toBe('done')
  expect(errors(rebound)).toEqual([])
})

it('arms the one alarm at the round deadline and reveals when it fires with nobody connected', async () => {
  const { runtime, conn } = hosted({ clipSeconds: 3 })
  await send(runtime, conn, { type: 'start', msgId: makeId(), avoidTrackIds: [] })
  const endsAt = runtime.saved?.room.roundEndsAt
  expect(typeof endsAt).toBe('number')
  expect(runtime.alarm).toBe(endsAt)

  close(runtime, conn)
  runtime.clock = (endsAt ?? 0) + 1
  await runtime.host.alarm()
  expect(runtime.saved?.room.phase).toBe('reveal')
  expect(runtime.alarm).toBe(T0 + REAP_MS)
})

it('ignores an alarm that fires before the deadline and arms it again', async () => {
  const { runtime, conn } = hosted()
  await send(runtime, conn, { type: 'start', msgId: makeId(), avoidTrackIds: [] })
  const endsAt = runtime.saved?.room.roundEndsAt
  runtime.clock += 1_000
  await runtime.host.alarm()
  expect(runtime.saved?.room.phase).toBe('playing')
  expect(runtime.alarm).toBe(endsAt)
})

it('does not rewrite the alarm for a guess', async () => {
  const { runtime, conn } = hosted()
  await send(runtime, conn, { type: 'start', msgId: makeId(), avoidTrackIds: [] })
  const writes = runtime.alarmWrites
  await send(runtime, conn, { type: 'guess', msgId: makeId(), text: 'nope' })
  expect(runtime.alarmWrites).toBe(writes)
})

it('reaps a room nobody has touched for six hours, but not one with a socket', async () => {
  const { runtime, conn } = hosted()
  runtime.clock = T0 + REAP_MS + 1
  await runtime.host.alarm()
  expect(runtime.wiped).toBe(false)
  expect(runtime.alarm).toBe(runtime.clock + REAP_MS)

  close(runtime, conn)
  runtime.clock += REAP_MS + 1
  await runtime.host.alarm()
  expect(runtime.wiped).toBe(true)
  expect(runtime.host.exists()).toBe(false)
})

it('destroys the room when the last player leaves', async () => {
  const { runtime, conn } = hosted()
  await send(runtime, conn, { type: 'leave' })
  expect(conn.inbox.at(-1)).toEqual({ type: 'left' })
  expect(runtime.wiped).toBe(true)
  expect(runtime.host.exists()).toBe(false)
  const again: FakeConn = { id: 'x', playerId: 'p', inbox: [], send: (m) => again.inbox.push(m) }
  expect(runtime.host.admit(again, { playerId: 'p', intent: 'resume' })).toBe(false)
})

it('keeps the room when one of two players leaves', async () => {
  const { runtime, conn } = hosted({ mode: 'room' })
  const guest = open(runtime, makeId(), 'join')
  if (!guest) throw new Error('guest')
  await send(runtime, guest, { type: 'join', nickname: 'Riya' })
  await send(runtime, guest, { type: 'leave' })
  expect(runtime.wiped).toBe(false)
  expect(lastView(conn).players.map((player) => player.nickname)).toEqual(['Aman'])
})

it('puts a room left in starting back in the lobby and marks everyone away on wake', async () => {
  const pending = new Promise<never>(() => {})
  const stuck = makeRuntime(null, () => ({ mode: 'live', order: 'catalog', fetchImpl: () => pending }))
  const code = makeCode()
  const hostId = makeId()
  stuck.host.create(hostInput(code, hostId), code)
  const stuckConn = open(stuck, hostId, 'resume')
  if (!stuckConn) throw new Error('host')
  void send(stuck, stuckConn, { type: 'start', msgId: makeId(), avoidTrackIds: [] })
  await vi.waitFor(() => expect(stuck.saved?.room.starting).toBe(true))

  const woke = makeRuntime(stuck.saved)
  woke.host.wake()
  expect(woke.saved?.room.starting).toBe(false)
  expect(woke.saved?.room.players.every((player) => !player.connected)).toBe(true)
})

it('returns the room to the lobby and reports an error when song loading fails', async () => {
  const runtime = makeRuntime(null, () => ({
    mode: 'live',
    order: 'catalog',
    fetchImpl: () => Promise.reject(new Error('iTunes down')),
  }))
  const code = makeCode()
  const hostId = makeId()
  runtime.host.create(hostInput(code, hostId), code)
  const conn = open(runtime, hostId, 'resume')
  if (!conn) throw new Error('host')
  const msgId = makeId()
  await send(runtime, conn, { type: 'start', msgId, avoidTrackIds: [] })
  expect(lastView(conn).phase).toBe('lobby')
  expect(lastView(conn).starting).toBe(false)
  expect(errors(conn).length).toBe(1)
  expect(runtime.saved?.recentMsgIds[hostId] ?? []).not.toContain(msgId)
})

it('persists across a reload of the host object', async () => {
  const { runtime, conn, playerId } = hosted()
  await send(runtime, conn, { type: 'start', msgId: makeId(), avoidTrackIds: [] })
  const reloaded = makeRuntime(runtime.saved)
  reloaded.host.wake()
  const back = open(reloaded, playerId, 'resume')
  if (!back) throw new Error('resume after reload')
  expect(lastView(back).phase).toBe('playing')
})

it('reveals on wake when the deadline passed while the object was evicted', async () => {
  const { runtime, conn } = hosted({ clipSeconds: 3 })
  await send(runtime, conn, { type: 'start', msgId: makeId(), avoidTrackIds: [] })
  const reloaded = makeRuntime(runtime.saved)
  reloaded.clock = (runtime.saved?.room.roundEndsAt ?? 0) + 1
  reloaded.host.wake()
  expect(reloaded.saved?.room.phase).toBe('reveal')
})

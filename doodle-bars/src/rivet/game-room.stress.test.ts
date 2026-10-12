import { beforeEach, expect, it } from 'vitest'
import { MAX_PLAYERS } from '@/game/constants'
import { makeCode, makeId } from '@/game/ids'
import type { RoomView } from '@/game/protocol'
import { setupTest } from 'rivetkit/test'
import { isTakenCode } from './errors'
import { registry } from './registry'
import type { GameRoomInput, RoomClient, SnapshotEvent } from './types'

// Rivet gives the browser socket 5s. These fail earlier than that, on the local runner,
// which is the same actor startup path production times out on.
const SOCKET_MS = 3_000

process.env.RIVET_PORT = '6423'
process.env.RIVET_RUN_SERVICES = '0'

beforeEach(() => {
  process.env.SONG_PREVIEW_MODE = 'fixture'
  process.env.SONG_ORDER = 'catalog'
  process.env.GUESS_GRACE_SECONDS = '45'
})

type Client = RoomClient
type LiveConn = ReturnType<ReturnType<Client['gameRoom']['get']>['connect']>

it('opens many new rooms inside the socket budget', async (c) => {
  const { client } = await setupTest(c, registry)
  const rooms = await Promise.all(Array.from({ length: 8 }, () => createRoom(client)))
  for (const room of rooms) {
    expect(room.snapshots.at(-1)?.view.you.nickname).toBe('Aman')
    expect(room.errors).toEqual([])
    await room.conn.dispose()
  }
}, 30_000)

it('seats a full room at once and refuses one more', async (c) => {
  const { client } = await setupTest(c, registry)
  const host = await createRoom(client, { mode: 'room' })
  const guests = await Promise.all(
    Array.from({ length: MAX_PLAYERS - 1 }, () => open(client, host.code, makeId(), 'join')),
  )
  await Promise.all(guests.map((guest, index) => guest.conn.join(`Guest${index + 1}`)))
  await expect.poll(() => host.snapshots.at(-1)?.view.players.length).toBe(MAX_PLAYERS)
  for (const guest of guests) {
    await expect.poll(() => guest.snapshots.at(-1)?.view.players.length).toBe(MAX_PLAYERS)
    expect(guest.errors).toEqual([])
  }

  const extra = await open(client, host.code, makeId(), 'join')
  await extra.conn.join('Extra')
  await expect.poll(() => extra.errors.at(-1)).toBe('That room is full')
  expect(host.snapshots.at(-1)?.view.players).toHaveLength(MAX_PLAYERS)

  await host.conn.dispose()
  await extra.conn.dispose()
  await Promise.all(guests.map((guest) => guest.conn.dispose()))
}, 30_000)

it('survives a reconnect storm', async (c) => {
  const { client } = await setupTest(c, registry)
  const room = await createRoom(client)
  let conn = room.conn
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await conn.dispose()
    const again = await open(client, room.code, room.playerId, 'resume')
    await expect.poll(() => again.snapshots.at(-1)?.view.you.nickname).toBe('Aman')
    expect(again.snapshots.at(-1)?.view.phase).toBe('lobby')
    expect(again.errors).toEqual([])
    conn = again.conn
  }
  await conn.dispose()
}, 30_000)

it('starts a round the moment the socket opens', async (c) => {
  process.env.GUESS_GRACE_SECONDS = '1'
  const { client } = await setupTest(c, registry)
  const room = await createRoom(client, { roundCount: 1, clipSeconds: 1 })
  await room.conn.start(makeId(), [])
  const playing = await waitPhase(room.snapshots, 'playing')
  expect(JSON.stringify(playing.view)).not.toContain('Kesariya')
  const revealed = await waitPhase(room.snapshots, 'reveal', 8_000)
  expect(revealed.view.reveal?.title).toBe('Kesariya')
  expect(room.errors).toEqual([])
  await room.conn.dispose()
}, 30_000)

it('plays several rooms at the same time', async (c) => {
  const { client } = await setupTest(c, registry)
  const rooms = await Promise.all(
    Array.from({ length: 4 }, () => createRoom(client, { roundCount: 1, clipSeconds: 3 })),
  )
  await Promise.all(rooms.map((room) => room.conn.start(makeId(), [])))
  await Promise.all(rooms.map((room) => waitPhase(room.snapshots, 'playing')))
  await Promise.all(rooms.map((room) => room.conn.guess(makeId(), 'Kesariya')))
  const revealed = await Promise.all(rooms.map((room) => waitPhase(room.snapshots, 'reveal')))
  for (const [index, room] of rooms.entries()) {
    expect(revealed[index]?.view.code).toBe(room.code)
    expect(revealed[index]?.view.reveal?.title).toBe('Kesariya')
    expect(revealed[index]?.view.players[0]?.score).toBeGreaterThan(0)
    expect(room.errors).toEqual([])
    await room.conn.dispose()
  }
}, 30_000)

it('returns a dropped seat to the same round', async (c) => {
  const { client } = await setupTest(c, registry)
  const room = await createRoom(client, { roundCount: 1, clipSeconds: 3, mode: 'room' })
  const guest = await open(client, room.code, makeId(), 'join')
  await guest.conn.join('Riya')
  await room.conn.start(makeId(), [])
  await waitPhase(room.snapshots, 'playing')
  await room.conn.dispose()
  await guest.conn.dispose()

  const host = await open(client, room.code, room.playerId, 'resume')
  const back = await waitPhase(host.snapshots, 'playing')
  expect(JSON.stringify(back.view)).not.toContain('Kesariya')
  expect(back.view.players.map((player) => player.nickname).sort()).toEqual(['Aman', 'Riya'])
  await host.conn.guess(makeId(), 'Kesariya')
  const revealed = await waitPhase(host.snapshots, 'reveal')
  expect(revealed.view.reveal?.title).toBe('Kesariya')
  expect(host.errors).toEqual([])
  await host.conn.dispose()
}, 30_000)

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

async function createRoom(client: Client, extra?: Partial<GameRoomInput>) {
  const playerId = makeId()
  let lastError: unknown
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeCode()
    try {
      await client.gameRoom.create([code], { input: hostInput(code, playerId, extra) })
      const seat = await open(client, code, playerId, 'resume')
      await expect.poll(() => seat.snapshots.at(-1)?.view.phase, { timeout: SOCKET_MS }).toBe('lobby')
      return { ...seat, code, playerId }
    } catch (error) {
      lastError = error
      if (!isTakenCode(error)) break
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not open a room')
}

async function open(client: Client, code: string, playerId: string, intent: 'join' | 'resume') {
  const snapshots: SnapshotEvent[] = []
  const errors: string[] = []
  const started = performance.now()
  const conn: LiveConn = client.gameRoom.get([code]).connect({ playerId, intent })
  conn.on('snapshot', (payload) => {
    snapshots.push(payload)
  })
  conn.on('error', (payload) => {
    errors.push(payload.message)
  })
  await conn.ready
  const openedIn = performance.now() - started
  expect(openedIn, `${intent} ${code} opened in ${Math.round(openedIn)}ms`).toBeLessThan(SOCKET_MS)
  return { conn, snapshots, errors }
}

async function waitPhase(snapshots: SnapshotEvent[], phase: RoomView['phase'], timeout = 4_000): Promise<SnapshotEvent> {
  await expect.poll(() => snapshots.at(-1)?.view.phase, { timeout }).toBe(phase)
  const found = snapshots.at(-1)
  if (!found) throw new Error(`expected ${phase}`)
  return found
}

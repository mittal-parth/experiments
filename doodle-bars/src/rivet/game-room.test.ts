import { beforeEach, expect, it } from 'vitest'
import { makeCode, makeId } from '@/game/ids'
import type { RoomView } from '@/game/protocol'
import { setupTest } from 'rivetkit/test'
import { errorCode, errorText, explainConnectError, isMissingActor, isTakenCode, MISSING_ROOM } from './errors'
import { registry } from './registry'
import type { GameRoomInput, RoomClient, SnapshotEvent } from './types'

process.env.RIVET_PORT = '6421'
process.env.RIVET_RUN_SERVICES = '0'

beforeEach(() => {
  process.env.SONG_PREVIEW_MODE = 'fixture'
  process.env.SONG_ORDER = 'catalog'
  process.env.GUESS_GRACE_SECONDS = '45'
})

it('rejects an unknown room code', async (c) => {
  const { client } = await setupTest(c, registry)
  await expect(client.gameRoom.get([makeCode()]).resolve()).rejects.toSatisfy(
    (error: unknown) => explainConnectError(error) === MISSING_ROOM,
  )
})

it('refuses a second create for a live code', async (c) => {
  const { client } = await setupTest(c, registry)
  const code = makeCode()
  await client.gameRoom.create([code], { input: hostInput(code, makeId()) })
  const again = client.gameRoom.create([code], { input: hostInput(code, makeId()) })
  await expect(again).rejects.toSatisfy((error: unknown) => {
    if (isTakenCode(error)) return true
    throw new Error(`collision shape ${errorCode(error)} ${errorText(error)}`)
  })
})

it('plays a solo round without leaking the title, then reveals on the right guess', async (c) => {
  const { client } = await setupTest(c, registry)
  const room = await host(client, { roundCount: 1 })
  await room.conn.start(makeId(), [])
  const playing = await waitPhase(room.snapshots, 'playing')
  expect(JSON.stringify(playing.view)).not.toContain('Kesariya')
  expect(playing.view.artworkUrl).toBeNull()

  await room.conn.guess(makeId(), 'nope')
  await expect.poll(() => room.snapshots.at(-1)?.view.lastGuess?.correct).toBe(false)
  const missed = room.snapshots.at(-1)
  if (!missed) throw new Error('expected a miss')
  expect(missed.view.phase).toBe('playing')
  expect(missed.view.lastGuess).toEqual({ correct: false, close: false, artist: false, song: false, points: 0 })
  expect(JSON.stringify(missed.view)).not.toContain('Kesariya')

  await room.conn.guess(makeId(), 'Kesariya')
  const revealed = await waitPhase(room.snapshots, 'reveal')
  expect(revealed.view.reveal?.title).toBe('Kesariya')
  expect(revealed.view.reveal?.storeUrl).toContain('music.apple.com')
  expect(revealed.view.artworkUrl).toBe('/fixture-cover.svg')
  expect(revealed.view.you.nickname).toBe('Aman')
  expect(revealed.view.players[0]?.score).toBeGreaterThan(0)
  expect(revealed.view.setlist).toEqual([])
  await room.conn.dispose()
})

it('loads the number of songs the host asked for', async (c) => {
  const { client } = await setupTest(c, registry)
  const room = await host(client, { roundCount: 3, clipSeconds: 5 })
  expect(room.snapshots.at(-1)?.view.roundCount).toBe(3)
  await room.conn.start(makeId(), [])
  const playing = await waitPhase(room.snapshots, 'playing')
  expect(playing.view.totalRounds).toBe(3)
  expect(playing.view.roundNumber).toBe(1)
  await room.conn.dispose()
})

it('lets the same player finish from a second connection', async (c) => {
  const { client } = await setupTest(c, registry)
  const room = await host(client, { roundCount: 1 })
  await room.conn.start(makeId(), [])
  await waitPhase(room.snapshots, 'playing')
  await room.conn.guess(makeId(), 'Kesariya')
  const revealed = await waitPhase(room.snapshots, 'reveal')
  await room.conn.dispose()

  const rebound = await seat(client, room.code, room.playerId, 'resume')
  await rebound.conn.next(makeId(), revealed.view.roundNumber)
  const finished = await waitPhase(rebound.snapshots, 'done')
  expect(finished.view.phase).toBe('done')
  expect(rebound.errors).toEqual([])
  await rebound.conn.dispose()
})

it('tells a stranger to join before finishing', async (c) => {
  const { client } = await setupTest(c, registry)
  const room = await host(client, { roundCount: 1 })
  const stranger = await seat(client, room.code, makeId(), 'join')
  await stranger.conn.next(makeId(), 1)
  await expect.poll(() => stranger.errors.at(-1)).toBe('Join a room first')
  await stranger.conn.dispose()
  await room.conn.dispose()
})

it('does not score a repeated guess', async (c) => {
  const { client } = await setupTest(c, registry)
  const room = await host(client, { roundCount: 1 })
  await room.conn.start(makeId(), [])
  await waitPhase(room.snapshots, 'playing')
  const msgId = makeId()
  await room.conn.guess(msgId, 'nope')
  await expect.poll(() => room.snapshots.at(-1)?.view.guesses.length).toBe(1)
  await room.conn.guess(msgId, 'nope')
  await expect.poll(() => room.snapshots.at(-1)?.view.guesses.length).toBe(1)
  expect(room.snapshots.at(-1)?.view.players[0]?.score).toBe(0)
  await room.conn.dispose()
})

it('reveals when the round timer fires with no client call', async (c) => {
  process.env.GUESS_GRACE_SECONDS = '1'
  const { client } = await setupTest(c, registry)
  const room = await host(client, { roundCount: 1, clipSeconds: 1 })
  await room.conn.start(makeId(), [])
  await waitPhase(room.snapshots, 'playing')
  const revealed = await waitPhase(room.snapshots, 'reveal', 8_000)
  expect(revealed.view.reveal?.title).toBe('Kesariya')
  await room.conn.dispose()
})

it('keeps the room after the client disconnects', async (c) => {
  const { client } = await setupTest(c, registry)
  const room = await host(client)
  await room.conn.dispose()
  const again = await seat(client, room.code, room.playerId, 'resume')
  await expect.poll(() => again.snapshots.at(-1)?.view.you.nickname).toBe('Aman')
  expect(again.snapshots.at(-1)?.view.players).toHaveLength(1)
  await again.conn.dispose()
})

it('destroys the room when the last player leaves', async (c) => {
  const { client } = await setupTest(c, registry)
  const room = await host(client)
  await room.conn.leave()
  await expect.poll(async () => {
    try {
      await client.gameRoom.get([room.code]).resolve()
      return 'up'
    } catch (error) {
      return isMissingActor(error) ? 'gone' : `other:${errorCode(error)}:${errorText(error)}`
    }
  }, { timeout: 5_000 }).toBe('gone')
})

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

async function host(client: RoomClient, extra?: Partial<GameRoomInput>) {
  const code = makeCode()
  const playerId = makeId()
  await client.gameRoom.create([code], { input: hostInput(code, playerId, extra) })
  const seated = await seat(client, code, playerId, 'resume')
  await expect.poll(() => seated.snapshots.at(-1)?.view.phase).toBe('lobby')
  return { ...seated, code, playerId }
}

async function seat(client: RoomClient, code: string, playerId: string, intent: 'join' | 'resume') {
  const snapshots: SnapshotEvent[] = []
  const errors: string[] = []
  const conn = client.gameRoom.get([code]).connect({ playerId, intent })
  conn.on('snapshot', (payload: SnapshotEvent) => {
    snapshots.push(payload)
  })
  conn.on('error', (payload: { message: string }) => {
    errors.push(payload.message)
  })
  await conn.ready
  return { conn, snapshots, errors }
}

async function waitPhase(snapshots: SnapshotEvent[], phase: RoomView['phase'], timeout = 4_000): Promise<SnapshotEvent> {
  await expect.poll(() => snapshots.at(-1)?.view.phase, { timeout }).toBe(phase)
  const found = snapshots.at(-1)
  if (!found) throw new Error(`expected ${phase}`)
  return found
}

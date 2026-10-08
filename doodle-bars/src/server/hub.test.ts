import { beforeEach, describe, expect, it } from 'vitest'
import type { ServerMessage } from '@/game/protocol'
import { handleSocket, resetHub, type SocketLike } from './hub'

function fakeSocket() {
  const listeners: Record<'message' | 'close' | 'error', Array<(data: unknown) => void>> = {
    message: [],
    close: [],
    error: [],
  }
  const sent: ServerMessage[] = []
  const socket: SocketLike = {
    readyState: 1,
    send: (data) => {
      sent.push(JSON.parse(data) as ServerMessage)
    },
    on: (event, listener) => {
      listeners[event].push(listener)
    },
  }
  return {
    socket,
    sent,
    emit(message: unknown) {
      for (const listener of listeners.message) listener(JSON.stringify(message))
    },
    emitError() {
      for (const listener of listeners.error) listener(new Error('socket'))
    },
  }
}

function lastSnapshot(sent: ServerMessage[]) {
  const snapshots = sent.filter((message) => message.type === 'snapshot')
  return snapshots.at(-1)
}

describe('hub', () => {
  beforeEach(() => {
    resetHub()
    process.env.SONG_PREVIEW_MODE = 'fixture'
    process.env.SONG_ORDER = 'catalog'
    process.env.GUESS_GRACE_SECONDS = '45'
  })

  it('rejects an unknown room code', () => {
    const guest = fakeSocket()
    handleSocket(guest.socket)
    guest.emit({ type: 'join', code: 'ZZZZ', nickname: 'Riya' })
    expect(guest.sent.at(-1)).toEqual({ type: 'error', message: 'No room with that code' })
  })

  it('plays a solo round without leaking the title, then reveals on the right guess', async () => {
    const host = fakeSocket()
    handleSocket(host.socket)
    host.emit({
      type: 'create',
      nickname: 'Aman',
      playlistId: 'hindi',
      clipSeconds: 3,
      mode: 'solo',
    })
    host.emit({ type: 'start' })
    await viWait(host.sent)
    const playing = lastSnapshot(host.sent)
    if (playing?.type !== 'snapshot') throw new Error('expected snapshot')
    expect(playing.view.phase).toBe('playing')
    expect(JSON.stringify(playing.view)).not.toContain('Kesariya')
    expect(playing.view.artworkUrl).toBeNull()

    host.emit({ type: 'guess', text: 'nope' })
    const missed = lastSnapshot(host.sent)
    if (missed?.type !== 'snapshot') throw new Error('expected miss')
    expect(missed.view.phase).toBe('playing')
    expect(missed.view.lastGuess).toEqual({ correct: false, close: false, artist: false, song: false, points: 0 })
    expect(JSON.stringify(missed.view)).not.toContain('Kesariya')

    host.emit({ type: 'guess', text: 'Kesariya' })
    const revealed = lastSnapshot(host.sent)
    if (revealed?.type !== 'snapshot') throw new Error('expected reveal')
    expect(revealed.view.reveal?.title).toBe('Kesariya')
    expect(revealed.view.reveal?.storeUrl).toContain('music.apple.com')
    expect(revealed.view.artworkUrl).toBe('/fixture-cover.svg')
    expect(revealed.view.you.nickname).toBe('Aman')
    expect(revealed.view.players[0]?.score).toBeGreaterThan(0)
    expect(revealed.view.setlist).toEqual([])
  })

  it('loads the number of songs the host asked for', async () => {
    const host = fakeSocket()
    handleSocket(host.socket)
    host.emit({
      type: 'create',
      nickname: 'Aman',
      playlistId: 'hindi',
      clipSeconds: 5,
      roundCount: 3,
      mode: 'solo',
    })
    const lobby = lastSnapshot(host.sent)
    if (lobby?.type !== 'snapshot') throw new Error('expected lobby')
    expect(lobby.view.roundCount).toBe(3)
    host.emit({ type: 'start' })
    await viWait(host.sent)
    const playing = lastSnapshot(host.sent)
    if (playing?.type !== 'snapshot') throw new Error('expected snapshot')
    expect(playing.view.totalRounds).toBe(3)
    expect(playing.view.roundNumber).toBe(1)
  })

  it('finishes the set when the socket forgot the room but the click still names the player', async () => {
    const host = fakeSocket()
    handleSocket(host.socket)
    host.emit({
      type: 'create',
      nickname: 'Aman',
      playlistId: 'hindi',
      clipSeconds: 3,
      roundCount: 1,
      mode: 'solo',
    })
    host.emit({ type: 'start' })
    await viWait(host.sent)
    host.emit({ type: 'guess', text: 'Kesariya' })
    const revealed = lastSnapshot(host.sent)
    if (revealed?.type !== 'snapshot') throw new Error('expected reveal')
    expect(revealed.view.phase).toBe('reveal')

    const rebound = fakeSocket()
    handleSocket(rebound.socket)
    rebound.emit({
      type: 'next',
      roundNumber: revealed.view.roundNumber,
      code: revealed.view.code,
      playerId: revealed.playerId,
    })
    const finished = lastSnapshot(rebound.sent)
    if (finished?.type !== 'snapshot') throw new Error('expected the recap')
    expect(finished.view.phase).toBe('done')
    expect(rebound.sent.some((message) => message.type === 'error')).toBe(false)
  })

  it('keeps the seat when the socket reports an error and has not closed', async () => {
    const host = fakeSocket()
    handleSocket(host.socket)
    host.emit({
      type: 'create',
      nickname: 'Aman',
      playlistId: 'hindi',
      clipSeconds: 3,
      roundCount: 1,
      mode: 'solo',
    })
    host.emit({ type: 'start' })
    await viWait(host.sent)
    host.emitError()
    host.emit({ type: 'guess', text: 'Kesariya' })
    const revealed = lastSnapshot(host.sent)
    if (revealed?.type !== 'snapshot') throw new Error('expected reveal')
    expect(revealed.view.phase).toBe('reveal')
    expect(host.sent.some((message) => message.type === 'error' && message.message === 'Join a room first')).toBe(
      false,
    )
  })

  it('still tells a stranger to join before finishing', () => {
    const stranger = fakeSocket()
    handleSocket(stranger.socket)
    stranger.emit({ type: 'next', roundNumber: 1 })
    expect(stranger.sent.at(-1)).toEqual({ type: 'error', message: 'Join a room first' })
  })
})

async function viWait(sent: ServerMessage[]): Promise<void> {
  const started = Date.now()
  while (Date.now() - started < 2000) {
    const latest = lastSnapshot(sent)
    if (latest?.type === 'snapshot' && latest.view.phase === 'playing') return
    await new Promise((resolve) => {
      setTimeout(resolve, 10)
    })
  }
  throw new Error('round did not start')
}

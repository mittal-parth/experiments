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
    expect(missed.view.lastGuess).toEqual({ correct: false, close: false, points: 0 })
    expect(JSON.stringify(missed.view)).not.toContain('Kesariya')

    host.emit({ type: 'guess', text: 'Kesariya' })
    const revealed = lastSnapshot(host.sent)
    if (revealed?.type !== 'snapshot') throw new Error('expected reveal')
    expect(revealed.view.reveal?.title).toBe('Kesariya')
    expect(revealed.view.reveal?.storeUrl).toContain('music.apple.com')
    expect(revealed.view.artworkUrl).toBe('/fixture-cover.svg')
    expect(revealed.view.you.nickname).toBe('Aman')
    expect(revealed.view.players[0]?.score).toBeGreaterThan(0)
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

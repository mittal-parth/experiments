import { describe, expect, it } from 'vitest'
import { advance, beginGame, configureRoom, createRoom, joinRoom, markStarting, restart, submitGuess, toView, type RoundSong } from './room'

const song = (title: string): RoundSong => ({
  trackId: 1,
  title,
  artist: 'Someone',
  aliases: [],
  previewUrl: '/api/fixture-tone',
  storeUrl: 'https://music.apple.com/in/song/1',
})

function lobby() {
  return createRoom({
    code: 'ABCD',
    hostId: 'host',
    nickname: 'Aman',
    playlistId: 'hindi',
    playlistName: 'Hindi',
    clipSeconds: 5,
    mode: 'room',
  })
}

describe('room', () => {
  it('rejects a bad join, a guest changing settings, and an unknown path stays in the lobby', () => {
    const room = lobby()
    expect(joinRoom(room, { id: 'guest', nickname: 'Riya' }).ok).toBe(true)
    const solo = { ...room, mode: 'solo' as const }
    expect(joinRoom(solo, { id: 'guest', nickname: 'Riya' })).toEqual({
      ok: false,
      error: 'That game is solo',
    })
    const withGuest = joinRoom(room, { id: 'guest', nickname: 'Riya' })
    if (!withGuest.ok) throw new Error('expected join')
    expect(configureRoom(withGuest.room, 'guest', 'english-pop', 'English pop', 3).ok).toBe(false)
  })

  it('hides the title while playing, then reveals when the only player scores', () => {
    const started = markStarting(lobby(), 'host')
    if (!started.ok) throw new Error('expected start')
    const begun = beginGame(started.room, [song('Kesariya'), song('Ilahi')], 1_000, 12)
    if (!begun.ok) throw new Error('expected begin')
    const view = toView(begun.room, 'host')
    expect(view?.clip).toEqual({ previewUrl: '/api/fixture-tone' })
    expect(view?.reveal).toBeNull()
    expect(JSON.stringify(view)).not.toContain('Kesariya')
    expect(JSON.stringify(view)).not.toContain('1635014240')

    const wrong = submitGuess(begun.room, 'host', 'nope', 1_100)
    if (!wrong.ok) throw new Error('expected guess')
    expect(wrong.room.phase).toBe('playing')
    expect(toView(wrong.room, 'host')?.lastGuess).toEqual({ correct: false, points: 0 })

    const right = submitGuess(wrong.room, 'host', 'Kesariya', 1_200)
    if (!right.ok) throw new Error('expected score')
    expect(right.room.phase).toBe('reveal')
    expect(toView(right.room, 'host')?.reveal?.title).toBe('Kesariya')
    expect(right.room.players[0]?.score).toBeGreaterThan(0)
  })

  it('lets a second player score for less, then finishes the set', () => {
    const open = lobby()
    const joined = joinRoom(open, { id: 'guest', nickname: 'Riya' })
    if (!joined.ok) throw new Error('expected join')
    const started = markStarting(joined.room, 'host')
    if (!started.ok) throw new Error('expected start')
    const begun = beginGame(started.room, [song('Kesariya'), song('Ilahi')], 5_000, 12)
    if (!begun.ok) throw new Error('expected begin')
    const first = submitGuess(begun.room, 'guest', 'Kesariya', 5_000)
    if (!first.ok) throw new Error('expected first score')
    expect(first.room.phase).toBe('playing')
    const second = submitGuess(first.room, 'host', 'Kesariya', 5_000)
    if (!second.ok) throw new Error('expected second score')
    expect(second.room.phase).toBe('reveal')
    const guest = second.room.players.find((player) => player.id === 'guest')
    const host = second.room.players.find((player) => player.id === 'host')
    if (!guest || !host) throw new Error('missing players')
    expect(guest.score).toBeGreaterThan(host.score)

    const next = advance(second.room, 'host', 9_000, 12)
    if (!next.ok) throw new Error('expected next')
    expect(next.room.phase).toBe('playing')
    expect(next.room.roundIndex).toBe(1)
    const scored = submitGuess(next.room, 'host', 'Ilahi', 9_100)
    if (!scored.ok) throw new Error('expected score')
    const guestStill = scored.room.players.find((player) => player.id === 'guest')
    if (!guestStill) throw new Error('missing guest')
    const waiting = { ...scored.room, players: scored.room.players.map((player) => player.id === 'guest' ? { ...player, connected: false } : player) }
    const revealed = submitGuess(waiting, 'host', 'Ilahi', 9_100)
    expect(revealed.ok).toBe(false)
    const hostOnly = {
      ...scored.room,
      players: scored.room.players.map((player) =>
        player.id === 'guest' ? { ...player, connected: false } : player,
      ),
    }
    const finishGuess = submitGuess(
      { ...hostOnly, solvedIds: [], feedback: {} },
      'host',
      'Ilahi',
      9_200,
    )
    if (!finishGuess.ok) throw new Error('expected reveal')
    expect(finishGuess.room.phase).toBe('reveal')
    const done = advance(finishGuess.room, 'host', 20_000, 12)
    if (!done.ok) throw new Error('expected done')
    expect(done.room.phase).toBe('done')
    const again = restart(done.room, 'host')
    if (!again.ok) throw new Error('expected restart')
    expect(again.room.phase).toBe('lobby')
    expect(again.room.players.every((player) => player.score === 0)).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { advance, beginGame, configureRoom, createRoom, joinRoom, markStarting, restart, revealIfDue, submitGuess, toView, type RoundSong } from './room'

const song = (title: string): RoundSong => ({
  trackId: 1,
  title,
  artist: 'Someone',
  aliases: [],
  previewUrl: '/api/fixture-tone',
  storeUrl: 'https://music.apple.com/in/song/1',
  artworkUrl: 'https://example.test/cover.jpg',
})

function lobby() {
  return createRoom({
    code: 'ABCD',
    hostId: 'host',
    nickname: 'Aman',
    playlistId: 'hindi',
    playlistName: 'Hindi',
    clipSeconds: 5,
    roundCount: 5,
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
    expect(configureRoom(withGuest.room, 'guest', 'english-pop', 'English pop', 3, 8).ok).toBe(false)
    const configured = configureRoom(room, 'host', 'english-pop', 'English pop', 3, 8)
    if (!configured.ok) throw new Error('expected configure')
    expect(configured.room.roundCount).toBe(8)
    const capped = configureRoom(room, 'host', 'hindi', 'Hindi', 5, 100)
    if (!capped.ok) throw new Error('expected cap')
    expect(capped.room.roundCount).toBe(20)
  })

  it('hides the title while playing, then reveals when the only player scores', () => {
    const started = markStarting(lobby(), 'host')
    if (!started.ok) throw new Error('expected start')
    const begun = beginGame(started.room, [song('Kesariya'), song('Ilahi')], 1_000, 12)
    if (!begun.ok) throw new Error('expected begin')
    const view = toView(begun.room, 'host')
    expect(view?.clip).toEqual({ previewUrl: '/api/fixture-tone' })
    expect(view?.reveal).toBeNull()
    expect(view?.artworkUrl).toBeNull()
    expect(JSON.stringify(view)).not.toContain('Kesariya')
    expect(JSON.stringify(view)).not.toContain('example.test')
    expect(JSON.stringify(view)).not.toContain('1635014240')

    const wrong = submitGuess(begun.room, 'host', 'nope', 1_100)
    if (!wrong.ok) throw new Error('expected guess')
    expect(wrong.room.phase).toBe('playing')
    expect(toView(wrong.room, 'host')?.lastGuess).toEqual({ correct: false, close: false, points: 0 })
    expect(toView(wrong.room, 'host')?.guesses.map((guess) => guess.text)).toEqual(['nope'])

    const right = submitGuess(wrong.room, 'host', 'Kesariya', 1_200)
    if (!right.ok) throw new Error('expected score')
    expect(right.room.phase).toBe('reveal')
    expect(toView(right.room, 'host')?.reveal?.title).toBe('Kesariya')
    expect(toView(right.room, 'host')?.artworkUrl).toBe('https://example.test/cover.jpg')
    expect(right.room.players[0]?.score).toBeGreaterThan(0)
  })

  it('marks a near miss as close without points, and a fuzzy spelling scores', () => {
    const started = markStarting(lobby(), 'host')
    if (!started.ok) throw new Error('expected start')
    const begun = beginGame(started.room, [song('Tum Hi Ho'), song('Kesariya')], 1_000, 12)
    if (!begun.ok) throw new Error('expected begin')
    const close = submitGuess(begun.room, 'host', 'tum hi', 1_200)
    if (!close.ok) throw new Error('expected close')
    expect(close.room.phase).toBe('playing')
    expect(close.room.players[0]?.score).toBe(0)
    expect(toView(close.room, 'host')?.lastGuess).toEqual({ correct: false, close: true, points: 0 })
    expect(toView(close.room, 'host')?.reveal).toBeNull()

    const scored = submitGuess(close.room, 'host', 'Tumhee Ho', 1_500)
    if (!scored.ok) throw new Error('expected score')
    expect(scored.room.phase).toBe('reveal')
    expect(scored.room.players[0]?.score).toBeGreaterThan(0)
  })

  it('ends the room on the first correct guess and shares the guess log', () => {
    const open = lobby()
    const joined = joinRoom(open, { id: 'guest', nickname: 'Riya' })
    if (!joined.ok) throw new Error('expected join')
    const started = markStarting(joined.room, 'host')
    if (!started.ok) throw new Error('expected start')
    const begun = beginGame(started.room, [song('Kesariya'), song('Ilahi')], 5_000, 12)
    if (!begun.ok) throw new Error('expected begin')
    const miss = submitGuess(begun.room, 'guest', 'nope', 5_100)
    if (!miss.ok) throw new Error('expected miss')
    expect(miss.room.phase).toBe('playing')
    expect(toView(miss.room, 'host')?.guesses.map((guess) => [guess.nickname, guess.text])).toEqual([
      ['Riya', 'nope'],
    ])
    expect(JSON.stringify(toView(miss.room, 'host'))).not.toContain('Kesariya')

    const first = submitGuess(miss.room, 'guest', 'Kesariya', 5_200)
    if (!first.ok) throw new Error('expected first score')
    expect(first.room.phase).toBe('reveal')
    expect(toView(first.room, 'guest')?.artworkUrl).toBe('https://example.test/cover.jpg')
    expect(toView(first.room, 'host')?.artworkUrl).toBe('https://example.test/cover.jpg')
    expect(toView(first.room, 'host')?.reveal?.title).toBe('Kesariya')
    expect(submitGuess(first.room, 'host', 'Kesariya', 5_300)).toEqual({
      ok: false,
      error: 'Wait for the next round',
    })
    const guest = first.room.players.find((player) => player.id === 'guest')
    const host = first.room.players.find((player) => player.id === 'host')
    if (!guest || !host) throw new Error('missing players')
    expect(guest.score).toBeGreaterThan(host.score)
    expect(host.score).toBe(0)

    const next = advance(first.room, 'host', 9_000, 12)
    if (!next.ok) throw new Error('expected next')
    expect(next.room.phase).toBe('playing')
    expect(next.room.roundIndex).toBe(1)
    expect(next.room.guesses).toEqual([])
    const scored = submitGuess(next.room, 'host', 'Ilahi', 9_100)
    if (!scored.ok) throw new Error('expected score')
    expect(scored.room.phase).toBe('reveal')
    const done = advance(scored.room, 'host', 20_000, 12)
    if (!done.ok) throw new Error('expected done')
    expect(done.room.phase).toBe('done')
    const again = restart(done.room, 'host')
    if (!again.ok) throw new Error('expected restart')
    expect(again.room.phase).toBe('lobby')
    expect(again.room.players.every((player) => player.score === 0)).toBe(true)
    expect(again.room.history).toEqual([])
  })

  it('remembers which songs were guessed once the set is over', () => {
    const started = markStarting(lobby(), 'host')
    if (!started.ok) throw new Error('expected start')
    const begun = beginGame(started.room, [song('Kesariya'), song('Ilahi')], 1_000, 12)
    if (!begun.ok) throw new Error('expected begin')
    const scored = submitGuess(begun.room, 'host', 'Kesariya', 1_200)
    if (!scored.ok) throw new Error('expected score')
    const next = advance(scored.room, 'host', 2_000, 12)
    if (!next.ok) throw new Error('expected next')
    expect(JSON.stringify(toView(next.room, 'host'))).not.toContain('Kesariya')
    const ends = next.room.roundEndsAt
    if (ends === null) throw new Error('expected a timer')
    const revealed = revealIfDue(next.room, ends)
    expect(revealed.phase).toBe('reveal')
    const done = advance(revealed, 'host', ends + 1, 12)
    if (!done.ok) throw new Error('expected done')
    expect(toView(done.room, 'host')?.setlist).toEqual([
      {
        title: 'Kesariya',
        artist: 'Someone',
        storeUrl: 'https://music.apple.com/in/song/1',
        guessed: true,
        guessedBy: ['Aman'],
      },
      {
        title: 'Ilahi',
        artist: 'Someone',
        storeUrl: 'https://music.apple.com/in/song/1',
        guessed: false,
        guessedBy: [],
      },
    ])
  })
})

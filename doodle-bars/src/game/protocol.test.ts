import { describe, expect, it } from 'vitest'
import { parseClientMessage } from './protocol'

describe('parseClientMessage answer', () => {
  it('defaults a missing answer to the song and rejects an unknown one', () => {
    const created = parseClientMessage({
      type: 'create',
      nickname: 'Aman',
      playlistId: 'hindi',
      clipSeconds: 5,
      mode: 'solo',
    })
    expect(created?.type === 'create' ? created.answer : null).toBe('song')
    expect(
      parseClientMessage({
        type: 'configure',
        playlistId: 'kannada',
        clipSeconds: 5,
        roundCount: 8,
        answer: 'artist',
      }),
    ).toEqual({
      type: 'configure',
      playlistId: 'kannada',
      clipSeconds: 5,
      roundCount: 8,
      answer: 'artist',
    })
    expect(
      parseClientMessage({
        type: 'create',
        nickname: 'Aman',
        playlistId: 'hindi',
        clipSeconds: 5,
        mode: 'solo',
        answer: 'both',
      }),
    ).toBeNull()
  })
})

describe('parseClientMessage next', () => {
  it('keeps a missing round as unspecified and accepts a real one', () => {
    expect(parseClientMessage({ type: 'next' })).toEqual({ type: 'next', roundNumber: 0 })
    expect(parseClientMessage({ type: 'next', roundNumber: 2 })).toEqual({ type: 'next', roundNumber: 2 })
    expect(parseClientMessage({ type: 'next', roundNumber: 1.5 })).toEqual({ type: 'next', roundNumber: 0 })
  })
})

describe('parseClientMessage start', () => {
  it('starts with no memory when the field is missing or messy', () => {
    expect(parseClientMessage({ type: 'start' })).toEqual({ type: 'start', avoidTrackIds: [] })
    expect(parseClientMessage({ type: 'start', avoidTrackIds: [3, 1, 3, -1, 2.5, 2] })).toEqual({
      type: 'start',
      avoidTrackIds: [1, 3, 2],
    })
  })
})

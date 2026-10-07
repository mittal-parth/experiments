import { describe, expect, it } from 'vitest'
import { orderAvoidingRecent } from './shuffle'

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const songs = Array.from({ length: 30 }, (_, index) => ({ trackId: index + 1 }))

describe('orderAvoidingRecent', () => {
  it('does not repeat a recently heard song while enough other songs remain', () => {
    const recent = [1, 2, 3, 4, 5, 6, 7, 8]
    for (let seed = 1; seed <= 40; seed += 1) {
      const ordered = orderAvoidingRecent(songs, recent, 5, mulberry32(seed))
      const prefix = ordered.slice(0, 5).map((song) => song.trackId)
      expect(prefix.some((id) => recent.includes(id))).toBe(false)
      expect(new Set(prefix).size).toBe(5)
    }
    expect(songs.map((song) => song.trackId)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1))
  })

  it('repeats the oldest songs once fewer than a full draw are left', () => {
    const recent = songs.map((song) => song.trackId)
    const ordered = orderAvoidingRecent(songs, recent, 5, () => 0.999999999)
    expect(ordered.slice(0, 5).map((song) => song.trackId)).toEqual([1, 2, 3, 4, 5])
  })

  it('still varies the draw inside the eligible pool', () => {
    const pool = songs.slice(0, 12)
    const counts = new Map<number, number>()
    for (let seed = 1; seed <= 300; seed += 1) {
      const first = orderAvoidingRecent(pool, [], 5, mulberry32(seed))[0]?.trackId
      if (first === undefined) throw new Error('expected a song')
      counts.set(first, (counts.get(first) ?? 0) + 1)
    }
    expect(counts.size).toBe(pool.length)
    for (const count of counts.values()) expect(count).toBeGreaterThan(0)

    const left = orderAvoidingRecent(pool, [], 5, mulberry32(1))
      .slice(0, 5)
      .map((song) => song.trackId)
    const right = orderAvoidingRecent(pool, [], 5, mulberry32(2))
      .slice(0, 5)
      .map((song) => song.trackId)
    expect(left).not.toEqual(right)
  })

  it('plays the whole library when it is smaller than a game', () => {
    const tiny = songs.slice(0, 3)
    const ordered = orderAvoidingRecent(tiny, [1, 2, 3], 5, () => 0.999999999)
    expect(ordered.map((song) => song.trackId)).toEqual([1, 2, 3])
  })
})

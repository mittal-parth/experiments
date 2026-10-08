import { describe, expect, it } from 'vitest'
import { bestScore, readStoredBest, withBest } from './best'

describe('personal best', () => {
  it('keeps the higher score for a nickname and ignores a lower one', () => {
    const first = withBest({}, 'Aman', 420)
    expect(bestScore(first, 'aman')).toBe(420)
    const same = withBest(first, ' Aman ', 100)
    expect(same).toBe(first)
    expect(bestScore(withBest(first, 'Aman', 800), 'Aman')).toBe(800)
  })

  it('drops junk from storage', () => {
    expect(readStoredBest('nope')).toEqual({})
    expect(readStoredBest(JSON.stringify({ aman: 12, riya: 0, bad: '9' }))).toEqual({ aman: 12 })
  })
})

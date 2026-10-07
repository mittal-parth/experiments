import { describe, expect, it } from 'vitest'
import { clampClipSeconds, clipStartSeconds } from './clip'
import { pointsForGuess } from './score'

describe('clampClipSeconds', () => {
  it('keeps the clip between 1 and 15 seconds', () => {
    expect(clampClipSeconds(0)).toBe(1)
    expect(clampClipSeconds(20)).toBe(15)
    expect(clampClipSeconds(Number.NaN)).toBe(5)
    expect(clampClipSeconds(4.2)).toBe(4)
  })
})

describe('clipStartSeconds', () => {
  it('starts late in a preview and leaves the clip inside the file', () => {
    expect(clipStartSeconds(30, 5)).toBe(24.5)
    expect(clipStartSeconds(30, 15)).toBe(14.5)
    expect(clipStartSeconds(30, 5) + 5).toBeLessThanOrEqual(30)
  })

  it('starts at the beginning when the file is too short to skip the opening', () => {
    expect(clipStartSeconds(8, 3)).toBe(0)
    expect(clipStartSeconds(Number.NaN, 5)).toBe(0)
    expect(clipStartSeconds(Number.POSITIVE_INFINITY, 5)).toBe(0)
  })
})

describe('pointsForGuess', () => {
  it('pays more for a fast guess and less for a later solver', () => {
    expect(pointsForGuess(0, 17_000, false)).toBe(1000)
    expect(pointsForGuess(17_000, 17_000, false)).toBe(100)
    expect(pointsForGuess(0, 17_000, true)).toBe(600)
  })
})

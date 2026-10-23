import { describe, expect, it } from 'vitest'
import { clipPlayhead, clipStartSeconds } from './clip'

describe('clipPlayhead', () => {
  it('skips the opening of a full preview and joins a clip already in progress', () => {
    expect(clipStartSeconds(30, 5)).toBe(24.5)
    expect(clipPlayhead(30, 5, 0)).toEqual({ from: 24.5, target: 24.5, finished: false })
    expect(clipPlayhead(30, 5, 2.4)).toEqual({ from: 24.5, target: 26.9, finished: false })
    expect(clipPlayhead(30, 5, 5)).toEqual({ from: 24.5, target: 29.5, finished: true })
  })

  it('starts a short file at the beginning', () => {
    expect(clipPlayhead(8, 5, 1)).toEqual({ from: 0, target: 1, finished: false })
  })
})

import { describe, expect, it } from 'vitest'
import { scoreBadge, ZERO_SCORE_BADGE } from './score-badge'

describe('scoreBadge', () => {
  it('shows a chick only for a score of zero', () => {
    expect(scoreBadge(0)).toBe(ZERO_SCORE_BADGE)
    expect(scoreBadge(25)).toBe('')
    expect(scoreBadge(984)).toBe('')
  })
})

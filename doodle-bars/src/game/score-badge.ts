export const ZERO_SCORE_BADGE = '🐥'

export function scoreBadge(score: number): string {
  return score === 0 ? ZERO_SCORE_BADGE : ''
}

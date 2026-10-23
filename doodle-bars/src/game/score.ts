import { clampClipSeconds } from './clip'

export type PointReason = 'title' | 'later' | 'artist'

const ARTIST_POINT_RATIO = 0.25

export function pointsForGuess(
  elapsedMs: number,
  roundMs: number,
  reason: PointReason = 'title',
): number {
  const safeRound = Math.max(1, roundMs)
  const elapsed = Math.min(Math.max(0, elapsedMs), safeRound)
  const ratio = (safeRound - elapsed) / safeRound
  const base = Math.max(100, Math.round(1000 * ratio))
  switch (reason) {
    case 'title':
      return base
    case 'later':
      return Math.max(50, Math.round(base * 0.6))
    case 'artist':
      return Math.max(25, Math.round(base * ARTIST_POINT_RATIO))
    default: {
      const unexpected: never = reason
      throw new Error(`Unexpected value: ${JSON.stringify(unexpected)}`)
    }
  }
}

export function roundDurationMs(clipSeconds: number, graceSeconds: number): number {
  return (clampClipSeconds(clipSeconds) + graceSeconds) * 1000
}

/** Seconds of guessing after the clip. Unset, blank, or below 1 falls back to 12. Capped at 120. */
export function graceSecondsFrom(raw: unknown): number {
  const value = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(value) || value < 1) return 12
  return Math.min(120, Math.floor(value))
}

export function guessGraceSeconds(): number {
  return graceSecondsFrom(process.env.GUESS_GRACE_SECONDS)
}

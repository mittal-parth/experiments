import { clampClipSeconds } from './clip'

export function pointsForGuess(elapsedMs: number, roundMs: number, later: boolean): number {
  const safeRound = Math.max(1, roundMs)
  const elapsed = Math.min(Math.max(0, elapsedMs), safeRound)
  const ratio = (safeRound - elapsed) / safeRound
  const base = Math.max(100, Math.round(1000 * ratio))
  if (!later) return base
  return Math.max(50, Math.round(base * 0.6))
}

export function roundDurationMs(clipSeconds: number, graceSeconds: number): number {
  return (clampClipSeconds(clipSeconds) + graceSeconds) * 1000
}

export function guessGraceSeconds(): number {
  const raw = Number(process.env.GUESS_GRACE_SECONDS)
  if (!Number.isFinite(raw) || raw < 1) return 12
  return Math.min(120, Math.floor(raw))
}

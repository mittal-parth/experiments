import { DEFAULT_ROUNDS, MAX_ROUNDS, MIN_ROUNDS } from './constants'

export function clampRoundCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_ROUNDS
  return Math.min(MAX_ROUNDS, Math.max(MIN_ROUNDS, Math.round(value)))
}

import {
  DEFAULT_CLIP_SECONDS,
  MAX_CLIP_SECONDS,
  MIN_CLIP_SECONDS,
} from './constants'

export function clampClipSeconds(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_CLIP_SECONDS
  return Math.min(MAX_CLIP_SECONDS, Math.max(MIN_CLIP_SECONDS, Math.round(value)))
}

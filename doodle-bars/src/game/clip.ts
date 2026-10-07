import {
  DEFAULT_CLIP_SECONDS,
  MAX_CLIP_SECONDS,
  MIN_CLIP_SECONDS,
} from './constants'

export function clampClipSeconds(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_CLIP_SECONDS
  return Math.min(MAX_CLIP_SECONDS, Math.max(MIN_CLIP_SECONDS, Math.round(value)))
}

// iTunes previews are about 30 seconds and open on the chorus. Skip that opening
// when the file is long enough to hold the clip later on.
const HOOK_SKIP_SECONDS = 12
const END_PAD_SECONDS = 0.5

export function clipStartSeconds(duration: number, clipSeconds: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0
  const clip = clampClipSeconds(clipSeconds)
  const latest = duration - clip - END_PAD_SECONDS
  if (latest < HOOK_SKIP_SECONDS) return 0
  return Math.round(latest * 10) / 10
}

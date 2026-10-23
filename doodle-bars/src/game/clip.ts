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

export type ClipPlayhead = {
  from: number
  target: number
  finished: boolean
}

/** Where this browser should be in the file so every player hears the same moment. */
export function clipPlayhead(duration: number, clipSeconds: number, elapsedSeconds: number): ClipPlayhead {
  const from = clipStartSeconds(duration, clipSeconds)
  const clip = clampClipSeconds(clipSeconds)
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0
  if (elapsed >= clip) return { from, target: from + clip, finished: true }
  const span = Number.isFinite(duration) && duration > 0 ? duration : from + clip
  return { from, target: Math.min(from + elapsed, span), finished: false }
}

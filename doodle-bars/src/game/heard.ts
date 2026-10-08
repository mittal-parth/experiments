export const HEARD_STORAGE_KEY = 'song-guesser-heard'
export const HEARD_LIMIT = 400

export type HeardMap = Record<string, number[]>

export function parseHeard(stored: string | null): HeardMap {
  if (!stored) return {}
  try {
    const parsed: unknown = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const map: HeardMap = {}
    for (const [playlistId, value] of Object.entries(parsed)) {
      if (!Array.isArray(value)) continue
      const ids = normalizeHistory(value)
      if (ids.length > 0) map[playlistId] = ids
    }
    return map
  } catch {
    return {}
  }
}

export function heardIds(stored: string | null, playlistId: string): number[] {
  return parseHeard(stored)[playlistId] ?? []
}

/** Oldest first. Hearing a track again moves it to the newest end. */
export function rememberTrack(
  history: readonly number[],
  trackId: number,
  limit = HEARD_LIMIT,
): number[] {
  return normalizeHistory([...history, trackId], limit)
}

export function storeHeard(stored: string | null, playlistId: string, trackId: number): string {
  const map = parseHeard(stored)
  map[playlistId] = rememberTrack(map[playlistId] ?? [], trackId)
  return JSON.stringify(map)
}

function normalizeHistory(value: readonly unknown[], limit = HEARD_LIMIT): number[] {
  const ids: number[] = []
  for (const item of value) {
    if (typeof item !== 'number' || !Number.isInteger(item) || item <= 0) continue
    const existing = ids.indexOf(item)
    if (existing >= 0) ids.splice(existing, 1)
    ids.push(item)
    if (ids.length > limit) ids.shift()
  }
  return ids
}

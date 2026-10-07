import { ROUNDS_PER_GAME } from './constants'

export type ShuffleRng = () => number

/**
 * Orders songs so the front of the list is a uniform draw from tracks that
 * have not been heard recently. `recentIds` is oldest-first. The newest ids
 * stay out of the draw while at least `take` other songs remain. Once that
 * threshold is met, the oldest ids become eligible and may repeat.
 * Eligible and deferred songs are each Fisher-Yates shuffled, so the draw
 * stays uniformly random inside whichever pool it comes from.
 */
export function orderAvoidingRecent<T extends { trackId: number }>(
  songs: readonly T[],
  recentIds: readonly number[],
  take = ROUNDS_PER_GAME,
  rng: ShuffleRng = Math.random,
): T[] {
  const catalogIds = new Set(songs.map((song) => song.trackId))
  const seen = new Set<number>()
  const recentInCatalog: number[] = []
  for (const id of recentIds) {
    if (!catalogIds.has(id) || seen.has(id)) continue
    seen.add(id)
    recentInCatalog.push(id)
  }

  const pool = Math.min(Math.max(take, 1), songs.length)
  let avoided = recentInCatalog.length
  while (songs.length - avoided < pool && avoided > 0) avoided -= 1
  const avoid = new Set(recentInCatalog.slice(recentInCatalog.length - avoided))

  const eligible: T[] = []
  const deferred: T[] = []
  for (const song of songs) {
    if (avoid.has(song.trackId)) deferred.push(song)
    else eligible.push(song)
  }
  shuffleInPlace(eligible, rng)
  shuffleInPlace(deferred, rng)
  return [...eligible, ...deferred]
}

function shuffleInPlace<T>(items: T[], rng: ShuffleRng): void {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1))
    const current = items[index]
    items[index] = items[swap]
    items[swap] = current
  }
}

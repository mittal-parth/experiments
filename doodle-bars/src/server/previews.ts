import { request } from 'node:https'
import type { Playlist, Song } from '@/catalog/types'
import { DEFAULT_ROUNDS } from '@/game/constants'
import { clampRoundCount } from '@/game/rounds'
import type { RoundSong } from '@/game/room'
import { orderAvoidingRecent, type ShuffleRng } from '@/game/shuffle'

export type PreviewMode = 'fixture' | 'live'
export type SongOrder = 'catalog' | 'shuffle'

export type PreviewOptions = {
  mode: PreviewMode
  order: SongOrder
  fetchImpl?: typeof fetch
}

type LookupTrack = {
  trackId?: number
  previewUrl?: string
  trackViewUrl?: string
  artworkUrl100?: string
}

const FIXTURE_ARTWORK = '/fixture-cover.svg'
const LOOKUP_LIMIT = 40
const LOOKUP_SPARE = 8
const HIT_TTL_MS = 6 * 60 * 60 * 1000
const RETRY_DELAYS_MS = [200, 600]

type CachedPreview = {
  previewUrl: string
  storeUrl: string | null
  artworkUrl: string | null
  at: number
}

const previewCache = new Map<string, CachedPreview>()
let lookupChain: Promise<unknown> = Promise.resolve()

export function clearPreviewCache(): void {
  previewCache.clear()
}

export function largerArtwork(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('https://')) return null
  return raw.replace(/\/\d+x\d+bb\.jpg(?=$|\?)/i, '/600x600bb.jpg')
}

export function previewOptionsFromEnv(): PreviewOptions {
  return {
    mode: process.env.SONG_PREVIEW_MODE === 'fixture' ? 'fixture' : 'live',
    order: process.env.SONG_ORDER === 'catalog' ? 'catalog' : 'shuffle',
  }
}

export async function loadRoundSongs(
  playlist: Playlist,
  options: PreviewOptions,
  roundCount = DEFAULT_ROUNDS,
  avoidTrackIds: readonly number[] = [],
  rng: ShuffleRng = Math.random,
): Promise<RoundSong[]> {
  const take = clampRoundCount(roundCount)
  const ordered = orderSongs(playlist.songs, options.order, avoidTrackIds, take, rng)
  // Lookup only this round, plus a few spares. The full playlist is a hundred-plus
  // tracks, and iTunes will rate-limit a burst of those calls.
  const resolved: RoundSong[] = []
  let index = 0
  while (resolved.length < take && index < ordered.length) {
    const size = Math.min(LOOKUP_LIMIT, take - resolved.length + LOOKUP_SPARE, ordered.length - index)
    const window = ordered.slice(index, index + size)
    index += window.length
    const batch = await resolvePreviews(window, playlist.storefront, options)
    resolved.push(...batch)
  }
  return resolved.slice(0, take)
}

export function orderSongs<T extends { trackId: number }>(
  songs: readonly T[],
  order: SongOrder,
  avoidTrackIds: readonly number[] = [],
  take = DEFAULT_ROUNDS,
  rng: ShuffleRng = Math.random,
): T[] {
  if (order === 'catalog') return [...songs]
  return orderAvoidingRecent(songs, avoidTrackIds, take, rng)
}

async function resolvePreviews(
  songs: readonly Song[],
  storefront: string,
  options: PreviewOptions,
): Promise<RoundSong[]> {
  if (options.mode === 'fixture') {
    return songs.map((song) =>
      toRoundSong(song, '/api/fixture-tone', storeUrl(storefront, song.trackId), FIXTURE_ARTWORK),
    )
  }
  const tracks = await lookupTracks(songs.map((song) => song.trackId), storefront, options.fetchImpl)
  const resolved: RoundSong[] = []
  for (const song of songs) {
    const match = tracks.get(song.trackId)
    if (!match) continue
    resolved.push(
      toRoundSong(
        song,
        match.previewUrl,
        match.storeUrl ?? storeUrl(storefront, song.trackId),
        match.artworkUrl,
      ),
    )
  }
  return resolved
}

function cacheKey(storefront: string, trackId: number): string {
  return `${storefront}:${trackId}`
}

function readCache(storefront: string, trackId: number, now: number): CachedPreview | null {
  const hit = previewCache.get(cacheKey(storefront, trackId))
  if (!hit) return null
  if (now - hit.at >= HIT_TTL_MS) {
    previewCache.delete(cacheKey(storefront, trackId))
    return null
  }
  return hit
}

function scheduleLookup<T>(task: () => Promise<T>): Promise<T> {
  const run = lookupChain.then(task, task)
  lookupChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

async function lookupTracks(
  ids: readonly number[],
  storefront: string,
  fetchImpl?: typeof fetch,
): Promise<Map<number, CachedPreview>> {
  const now = Date.now()
  const missing: number[] = []
  for (const id of ids) {
    if (!readCache(storefront, id, now)) missing.push(id)
  }
  for (let index = 0; index < missing.length; index += LOOKUP_LIMIT) {
    const chunk = missing.slice(index, index + LOOKUP_LIMIT)
    await scheduleLookup(() => fetchChunk(chunk, storefront, fetchImpl))
  }
  const found = new Map<number, CachedPreview>()
  const after = Date.now()
  for (const id of ids) {
    const hit = readCache(storefront, id, after)
    if (hit) found.set(id, hit)
  }
  return found
}

async function fetchChunk(ids: readonly number[], storefront: string, fetchImpl?: typeof fetch): Promise<void> {
  const now = Date.now()
  const need = ids.filter((id) => !readCache(storefront, id, now))
  if (need.length === 0) return
  const url = `https://itunes.apple.com/lookup?id=${need.join(',')}&country=${encodeURIComponent(storefront)}`
  const body = await readLookupWithRetry(url, fetchImpl)
  const byId = new Map<number, LookupTrack>()
  for (const result of body.results ?? []) {
    if (typeof result.trackId === 'number') byId.set(result.trackId, result)
  }
  const storedAt = Date.now()
  for (const id of need) {
    const match = byId.get(id)
    if (!match?.previewUrl) continue
    previewCache.set(cacheKey(storefront, id), {
      previewUrl: match.previewUrl,
      storeUrl: match.trackViewUrl ?? null,
      artworkUrl: largerArtwork(match.artworkUrl100),
      at: storedAt,
    })
  }
}

async function readLookupWithRetry(url: string, fetchImpl?: typeof fetch): Promise<{ results?: LookupTrack[] }> {
  let last: unknown
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await readLookup(url, fetchImpl)
    } catch (error) {
      last = error
      const delay = RETRY_DELAYS_MS[attempt]
      if (delay === undefined || !retryableLookup(error)) break
      await new Promise((resolve) => {
        setTimeout(resolve, delay)
      })
    }
  }
  throw last instanceof Error ? last : new Error('iTunes lookup failed')
}

function retryableLookup(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ''
  if (/timed out|fetch failed|network|econnreset|socket/i.test(message)) return true
  const status = Number(message.match(/\((\d+)\)/)?.[1])
  return status === 403 || status === 429 || status >= 500
}

function toRoundSong(song: Song, previewUrl: string, store: string, artworkUrl: string | null): RoundSong {
  return {
    trackId: song.trackId,
    title: song.title,
    artist: song.artist,
    aliases: [...(song.aliases ?? [])],
    previewUrl,
    storeUrl: store,
    artworkUrl,
  }
}

function storeUrl(storefront: string, trackId: number): string {
  return `https://music.apple.com/${storefront}/song/${trackId}`
}

async function readLookup(url: string, fetchImpl?: typeof fetch): Promise<{ results?: LookupTrack[] }> {
  if (fetchImpl) {
    const response = await fetchImpl(url)
    if (!response.ok) throw new Error(`iTunes lookup failed (${response.status})`)
    return (await response.json()) as { results?: LookupTrack[] }
  }
  return readHttpsJson(url)
}

function readHttpsJson(url: string): Promise<{ results?: LookupTrack[] }> {
  return new Promise((resolve, reject) => {
    const req = request(url, { method: 'GET', headers: { accept: 'application/json' } }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })
      res.on('end', () => {
        const status = res.statusCode ?? 500
        if (status >= 400) {
          reject(new Error(`iTunes lookup failed (${status})`))
          return
        }
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as { results?: LookupTrack[] })
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Bad iTunes response'))
        }
      })
    })
    req.setTimeout(10_000, () => {
      req.destroy(new Error('iTunes lookup timed out'))
    })
    req.on('error', reject)
    req.end()
  })
}

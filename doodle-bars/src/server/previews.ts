import { request } from 'node:https'
import type { Playlist, Song } from '@/catalog/types'
import { ROUNDS_PER_GAME } from '@/game/constants'
import type { RoundSong } from '@/game/room'

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
): Promise<RoundSong[]> {
  const ordered = orderSongs(playlist.songs, options.order)
  const resolved = await resolvePreviews(ordered, playlist.storefront, options)
  return resolved.slice(0, ROUNDS_PER_GAME)
}

export function orderSongs<T>(songs: readonly T[], order: SongOrder): T[] {
  const copy = [...songs]
  if (order === 'catalog') return copy
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    const current = copy[index]
    copy[index] = copy[swap]
    copy[swap] = current
  }
  return copy
}

async function resolvePreviews(
  songs: readonly Song[],
  storefront: string,
  options: PreviewOptions,
): Promise<RoundSong[]> {
  if (options.mode === 'fixture') {
    return songs.map((song) => toRoundSong(song, '/api/fixture-tone', storeUrl(storefront, song.trackId)))
  }
  const ids = songs.map((song) => song.trackId).join(',')
  const url = `https://itunes.apple.com/lookup?id=${ids}&country=${encodeURIComponent(storefront)}`
  const body = await readLookup(url, options.fetchImpl)
  const byId = new Map<number, LookupTrack>()
  for (const result of body.results ?? []) {
    if (typeof result.trackId === 'number') byId.set(result.trackId, result)
  }
  const resolved: RoundSong[] = []
  for (const song of songs) {
    const match = byId.get(song.trackId)
    if (!match?.previewUrl) continue
    resolved.push(
      toRoundSong(song, match.previewUrl, match.trackViewUrl ?? storeUrl(storefront, song.trackId)),
    )
  }
  return resolved
}

function toRoundSong(song: Song, previewUrl: string, store: string): RoundSong {
  return {
    trackId: song.trackId,
    title: song.title,
    artist: song.artist,
    aliases: [...(song.aliases ?? [])],
    previewUrl,
    storeUrl: store,
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

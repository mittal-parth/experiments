import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hindi } from '@/catalog/playlists/hindi'
import type { Playlist } from '@/catalog/types'
import { clearPreviewCache, largerArtwork, loadRoundSongs } from './previews'

function lookupResponse(songs: readonly { trackId: number }[], include: (trackId: number) => boolean) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      results: songs.filter((song) => include(song.trackId)).map((song) => ({
        trackId: song.trackId,
        previewUrl: `https://audio.example/${song.trackId}.m4a`,
        trackViewUrl: `https://music.apple.com/in/song/${song.trackId}`,
        artworkUrl100: `https://is1-ssl.mzstatic.com/image/thumb/${song.trackId}/100x100bb.jpg`,
      })),
    }),
  }
}

describe('loadRoundSongs', () => {
  beforeEach(() => {
    clearPreviewCache()
  })
  it('uses the fixture tone and catalog order without calling iTunes', async () => {
    const fetchImpl = vi.fn()
    const songs = await loadRoundSongs(hindi, {
      mode: 'fixture',
      order: 'catalog',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(songs).toHaveLength(5)
    expect(songs[0]?.title).toBe('Kesariya')
    const short = await loadRoundSongs(hindi, {
      mode: 'fixture',
      order: 'catalog',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }, 3)
    expect(short).toHaveLength(3)
    const capped = await loadRoundSongs(hindi, {
      mode: 'fixture',
      order: 'catalog',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }, 100)
    expect(capped).toHaveLength(20)
    expect(songs[0]?.previewUrl).toBe('/api/fixture-tone')
    expect(songs[0]?.artworkUrl).toBe('/fixture-cover.svg')
    expect(songs[0]?.storeUrl).toContain('music.apple.com')
  })

  it('asks iTunes only for the round, then reuses the cache', async () => {
    const fetchImpl = vi.fn(async (url: string) => lookupResponse(hindi.songs, (id) => url.includes(String(id))))
    const options = {
      mode: 'live' as const,
      order: 'catalog' as const,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }
    const songs = await loadRoundSongs(hindi, options)
    expect(songs[0]?.title).toBe('Kesariya')
    expect(songs[0]?.previewUrl).toBe('https://audio.example/1635014240.m4a')
    expect(songs[0]?.artworkUrl).toBe('https://is1-ssl.mzstatic.com/image/thumb/1635014240/600x600bb.jpg')
    const requested = new URL(String(fetchImpl.mock.calls[0]?.[0])).searchParams.get('id')?.split(',') ?? []
    expect(requested.length).toBeLessThan(20)
    expect(requested).toContain('1635014240')
    expect(requested).not.toContain(String(hindi.songs.at(-1)?.trackId))

    fetchImpl.mockClear()
    const again = await loadRoundSongs(hindi, options)
    expect(again[0]?.trackId).toBe(songs[0]?.trackId)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('retries a rate limit, then continues past songs with no preview', async () => {
    const songs = Array.from({ length: 12 }, (_, index) => ({
      trackId: index + 1,
      title: `Song ${index + 1}`,
      artist: 'Someone',
    }))
    const playlist: Playlist = {
      id: 'sample',
      name: 'Sample',
      description: 'Sample',
      storefront: 'us',
      songs,
    }
    let calls = 0
    const fetchImpl = vi.fn(async (url: string) => {
      calls += 1
      if (calls === 1) return { ok: false, status: 429, json: async () => ({}) }
      const ids = new URL(url).searchParams.get('id')?.split(',').map(Number) ?? []
      return lookupResponse(songs, (id) => ids.includes(id) && id >= 11)
    })
    const resolved = await loadRoundSongs(playlist, {
      mode: 'live',
      order: 'catalog',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }, 1)
    expect(calls).toBeGreaterThan(1)
    expect(resolved.map((song) => song.trackId)).toEqual([11])
  })

  it('skips songs this player already heard, then repeats the oldest once the pool is used up', async () => {
    const ids = hindi.songs.map((song) => song.trackId)
    const heard = ids.slice(0, 10)
    const skipped = await loadRoundSongs(
      hindi,
      { mode: 'fixture', order: 'shuffle' },
      5,
      heard,
      () => 0.999999999,
    )
    expect(skipped.map((song) => song.trackId)).toEqual(ids.slice(10, 15))

    const exhausted = await loadRoundSongs(
      hindi,
      { mode: 'fixture', order: 'shuffle' },
      5,
      ids,
      () => 0.999999999,
    )
    expect(exhausted.map((song) => song.trackId)).toEqual(ids.slice(0, 5))
  })

  it('keeps catalog order even when those songs were heard', async () => {
    const ids = hindi.songs.map((song) => song.trackId)
    const songs = await loadRoundSongs(hindi, { mode: 'fixture', order: 'catalog' }, 5, ids, () => 0)
    expect(songs.map((song) => song.title)).toEqual(hindi.songs.slice(0, 5).map((song) => song.title))
  })

  it('keeps an https cover and drops anything that is not one', () => {
    expect(largerArtwork('https://is1-ssl.mzstatic.com/image/thumb/a/100x100bb.jpg')).toBe(
      'https://is1-ssl.mzstatic.com/image/thumb/a/600x600bb.jpg',
    )
    expect(largerArtwork('http://example.test/cover.jpg')).toBeNull()
    expect(largerArtwork(undefined)).toBeNull()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { hindi } from '@/catalog/playlists/hindi'
import { largerArtwork, loadRoundSongs } from './previews'

describe('loadRoundSongs', () => {
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
    expect(songs[0]?.previewUrl).toBe('/api/fixture-tone')
    expect(songs[0]?.artworkUrl).toBe('/fixture-cover.svg')
    expect(songs[0]?.storeUrl).toContain('music.apple.com')
  })

  it('keeps curated titles when iTunes returns a preview', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        results: hindi.songs.map((song) => ({
          trackId: song.trackId,
          previewUrl: `https://audio.example/${song.trackId}.m4a`,
          trackViewUrl: `https://music.apple.com/in/song/${song.trackId}`,
          artworkUrl100: `https://is1-ssl.mzstatic.com/image/thumb/${song.trackId}/100x100bb.jpg`,
        })),
      }),
    }))
    const songs = await loadRoundSongs(hindi, {
      mode: 'live',
      order: 'catalog',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(songs[0]?.title).toBe('Kesariya')
    expect(songs[0]?.previewUrl).toBe('https://audio.example/1635014240.m4a')
    expect(songs[0]?.artworkUrl).toBe('https://is1-ssl.mzstatic.com/image/thumb/1635014240/600x600bb.jpg')
  })

  it('skips songs this player already heard, then repeats the oldest once the pool is used up', async () => {
    const ids = hindi.songs.map((song) => song.trackId)
    const heard = ids.slice(0, 10)
    const skipped = await loadRoundSongs(
      hindi,
      { mode: 'fixture', order: 'shuffle' },
      heard,
      () => 0.999999999,
    )
    expect(skipped.map((song) => song.trackId)).toEqual(ids.slice(10, 15))

    const exhausted = await loadRoundSongs(
      hindi,
      { mode: 'fixture', order: 'shuffle' },
      ids,
      () => 0.999999999,
    )
    expect(exhausted.map((song) => song.trackId)).toEqual(ids.slice(0, 5))
  })

  it('keeps catalog order even when those songs were heard', async () => {
    const ids = hindi.songs.map((song) => song.trackId)
    const songs = await loadRoundSongs(hindi, { mode: 'fixture', order: 'catalog' }, ids, () => 0)
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

import { describe, expect, it, vi } from 'vitest'
import { hindi } from '@/catalog/playlists/hindi'
import { loadRoundSongs } from './previews'

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
  })
})

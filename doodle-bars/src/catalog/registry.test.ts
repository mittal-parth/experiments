import { describe, expect, it } from 'vitest'
import { playlistChoices } from './public'
import { getPlaylist, listPlaylists } from './registry'

describe('playlist registry', () => {
  it('keeps public ids lined up with server playlists and unique track ids', () => {
    expect(playlistChoices.map((choice) => choice.id).sort()).toEqual(
      listPlaylists().map((playlist) => playlist.id).sort(),
    )
    for (const choice of playlistChoices) {
      expect(getPlaylist(choice.id)?.name).toBe(choice.name)
      expect(getPlaylist(choice.id)?.songs.length).toBeGreaterThan(0)
    }
    for (const playlist of listPlaylists()) {
      const ids = playlist.songs.map((song) => song.trackId)
      expect(new Set(ids).size).toBe(ids.length)
    }
    const hindiSongs = getPlaylist('hindi')?.songs ?? []
    expect(hindiSongs[0]?.title).toBe('Kesariya')
    expect(hindiSongs.length).toBeGreaterThan(70)
    expect(getPlaylist('hindi-romance')?.songs.length).toBeGreaterThan(20)
    expect(getPlaylist('hindi-party')?.songs.length).toBeGreaterThan(15)
    expect(getPlaylist('hindi-classics')?.songs.length).toBeGreaterThan(10)
    expect(getPlaylist('hindi-sufi')?.songs.length).toBeGreaterThan(8)
    expect(getPlaylist('punjabi')?.songs.length).toBeGreaterThan(40)
  })
})

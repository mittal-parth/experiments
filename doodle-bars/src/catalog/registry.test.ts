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
    const ids = listPlaylists().flatMap((playlist) => playlist.songs.map((song) => song.trackId))
    expect(new Set(ids).size).toBe(ids.length)
    expect(getPlaylist('hindi')?.songs[0]?.title).toBe('Kesariya')
  })
})

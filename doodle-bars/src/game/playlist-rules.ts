// Artist-specific playlists. Naming the act is free points, so guesses stay on the song.
// Add an id here when the next one lands.
const SONG_ONLY_PLAYLISTS = new Set<string>(['michael-jackson'])

export function allowsArtistGuess(playlistId: string): boolean {
  return !SONG_ONLY_PLAYLISTS.has(playlistId)
}

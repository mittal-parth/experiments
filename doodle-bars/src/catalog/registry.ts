import 'server-only'
import { english, englishClassics, englishParty, englishRock, englishRomance } from './playlists/english'
import { hindi, hindiClassics, hindiParty, hindiRomance, hindiSufi } from './playlists/hindi'
import { kannada } from './playlists/kannada'
import { michaelJackson } from './playlists/michael-jackson'
import { punjabi } from './playlists/punjabi'
import type { Playlist } from './types'

// Add a playlist: create playlists/<id>.ts, append it here, and add the same id to public.ts.
const playlists: readonly Playlist[] = [
  hindi,
  hindiRomance,
  hindiParty,
  hindiClassics,
  hindiSufi,
  punjabi,
  kannada,
  english,
  englishRomance,
  englishParty,
  englishClassics,
  englishRock,
  michaelJackson,
]

export function listPlaylists(): readonly Playlist[] {
  return playlists
}

export function getPlaylist(id: string): Playlist | null {
  return playlists.find((playlist) => playlist.id === id) ?? null
}

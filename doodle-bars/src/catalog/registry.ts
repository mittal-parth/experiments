import 'server-only'
import { englishPop } from './playlists/english-pop'
import { hindi } from './playlists/hindi'
import type { Playlist } from './types'

// Add a playlist: create playlists/<id>.ts, append it here, and add the same id to public.ts.
const playlists: readonly Playlist[] = [hindi, englishPop]

export function listPlaylists(): readonly Playlist[] {
  return playlists
}

export function getPlaylist(id: string): Playlist | null {
  return playlists.find((playlist) => playlist.id === id) ?? null
}

import type { createSongClient } from '@/rivet/browser-client'
import { createCloudflareClient } from './cloudflare-client'
import type { SongClient } from './types'

export type RoomBackend = 'cloudflare' | 'rivet'

/** Fixed at build time. `NEXT_PUBLIC_*` is inlined, so the Rivet branch is dropped from a Cloudflare build. */
export function roomBackend(): RoomBackend {
  return process.env.NEXT_PUBLIC_ROOM_BACKEND === 'rivet' ? 'rivet' : 'cloudflare'
}

export function roomWsUrl(): string {
  return process.env.NEXT_PUBLIC_ROOM_WS_URL || 'ws://127.0.0.1:8787'
}

export function createRoomClient(): SongClient {
  if (process.env.NEXT_PUBLIC_ROOM_BACKEND === 'rivet') {
    // Loaded lazily by the bundler so a Cloudflare build does not ship rivetkit.
    const rivet = require('@/rivet/browser-client') as { createSongClient: typeof createSongClient }
    return rivet.createSongClient()
  }
  return createCloudflareClient(roomWsUrl())
}

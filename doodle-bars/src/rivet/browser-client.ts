import { createClient } from 'rivetkit/client'
import type { SongClient } from './types'

export function rivetEndpoint(): string {
  return process.env.NEXT_PUBLIC_RIVET_ENDPOINT || 'http://127.0.0.1:6420'
}

export function createSongClient(endpoint = rivetEndpoint()): SongClient {
  return createClient({ endpoint, encoding: 'json' }) as unknown as SongClient
}

export type Song = {
  trackId: number
  title: string
  artist: string
  aliases?: readonly string[]
}

export type Playlist = {
  id: string
  name: string
  description: string
  storefront: string
  songs: readonly Song[]
}

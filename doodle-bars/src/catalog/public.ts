export type PlaylistChoice = {
  id: string
  name: string
  description: string
}

export const playlistChoices: readonly PlaylistChoice[] = [
  {
    id: 'hindi',
    name: 'Hindi',
    description: 'Bollywood hooks.',
  },
  {
    id: 'english-pop',
    name: 'English pop',
    description: 'Songs that stuck.',
  },
]

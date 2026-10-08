export type PlaylistChoice = {
  id: string
  name: string
  description: string
}

export const playlistChoices: readonly PlaylistChoice[] = [
  {
    id: 'hindi',
    name: 'Hindi mix',
    description: 'Film songs, mixed.',
  },
  {
    id: 'hindi-romance',
    name: 'Hindi romance',
    description: 'Love songs.',
  },
  {
    id: 'hindi-party',
    name: 'Hindi party',
    description: 'Dance songs.',
  },
  {
    id: 'hindi-classics',
    name: 'Hindi classics',
    description: 'Older film songs.',
  },
  {
    id: 'hindi-sufi',
    name: 'Hindi sufi',
    description: 'Sufi and devotional songs.',
  },
  {
    id: 'punjabi',
    name: 'Punjabi',
    description: 'Punjabi songs.',
  },
  {
    id: 'kannada',
    name: 'Kannada',
    description: 'Kannada songs.',
  },
  {
    id: 'english',
    name: 'English mix',
    description: 'Pop, rock, and older hits.',
  },
  {
    id: 'english-romance',
    name: 'English romance',
    description: 'Love songs.',
  },
  {
    id: 'english-party',
    name: 'English party',
    description: 'Dance songs.',
  },
  {
    id: 'english-classics',
    name: 'English classics',
    description: 'Older hits.',
  },
  {
    id: 'english-rock',
    name: 'English rock',
    description: 'Rock songs.',
  },
  {
    id: 'michael-jackson',
    name: 'Michael Jackson',
    description: 'MJ songs.',
  },
]

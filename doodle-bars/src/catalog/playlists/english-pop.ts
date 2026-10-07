import type { Playlist } from '../types'

// Add songs here. Store Apple track ids, not preview URLs.
export const englishPop: Playlist = {
  id: 'english-pop',
  name: 'English pop',
  description: 'Songs that stuck.',
  storefront: 'us',
  songs: [
    { trackId: 1193701392, title: 'Shape of You', artist: 'Ed Sheeran' },
    { trackId: 1615585008, title: 'As It Was', artist: 'Harry Styles' },
    { trackId: 1538003843, title: 'Levitating', artist: 'Dua Lipa' },
    { trackId: 269573364, title: 'Billie Jean', artist: 'Michael Jackson' },
    { trackId: 1544491233, title: 'Rolling in the Deep', artist: 'Adele' },
    { trackId: 1450695739, title: 'bad guy', artist: 'Billie Eilish' },
    {
      trackId: 943946671,
      title: 'Uptown Funk',
      artist: 'Mark Ronson & Bruno Mars',
    },
    { trackId: 1440933651, title: 'Shake It Off', artist: 'Taylor Swift' },
    { trackId: 1674691586, title: 'Flowers', artist: 'Miley Cyrus' },
    { trackId: 863835363, title: 'Happy', artist: 'Pharrell Williams' },
    { trackId: 1471704175, title: 'Counting Stars', artist: 'OneRepublic' },
    { trackId: 1544491998, title: 'Someone Like You', artist: 'Adele' },
  ],
}

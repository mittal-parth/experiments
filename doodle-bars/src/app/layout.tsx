import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import 'drawably/font.css'
import 'drawably/style.css'
import './globals.css'

const siteUrl = new URL('https://song.mittalparth.dev')
const title = 'Song Guesser'
const description = 'Hear a clip and guess the song! Play solo or with friends :)'

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: 'Song Guesser',
      url: siteUrl.href,
      description,
    },
    {
      '@type': 'WebApplication',
      name: 'Song Guesser',
      url: siteUrl.href,
      applicationCategory: 'Game',
      operatingSystem: 'Web',
      description,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
  ],
}

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title,
  description,
  applicationName: 'Song Guesser',
  keywords: [
    'song guesser',
    'guess the song',
    'music quiz',
    'name that tune',
    'multiplayer music game',
    'guess the artist',
  ],
  authors: [{ name: 'mittalparth_', url: 'https://x.com/mittalparth_' }],
  creator: 'mittalparth_',
  category: 'games',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description,
    type: 'website',
    siteName: 'Song Guesser',
    url: '/',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    site: '@mittalparth_',
    creator: '@mittalparth_',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  )
}

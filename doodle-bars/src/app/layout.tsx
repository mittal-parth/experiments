import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import 'drawably/font.css'
import 'drawably/style.css'
import './globals.css'

const description = 'Hear a clip and guess the song! Play solo or with friends :)'

function metadataBase(): URL {
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`)
  }
  if (process.env.VERCEL_ENV === 'production') {
    return new URL('https://gaanaguesser.vercel.app')
  }
  const port = process.env.PORT ?? '3000'
  return new URL(`http://127.0.0.1:${port}`)
}

export const metadata: Metadata = {
  metadataBase: metadataBase(),
  title: 'Song Guesser',
  description,
  openGraph: {
    title: 'Song Guesser',
    description,
    type: 'website',
    siteName: 'Song Guesser',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Song Guesser',
    description,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

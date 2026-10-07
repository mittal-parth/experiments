import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import 'drawably/font.css'
import 'drawably/style.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Song Guesser',
  description: 'Hear a short clip and name the song.',
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

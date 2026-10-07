import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import 'drawably/font.css'
import 'drawably/style.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Doodle Bars',
  description: 'Guess the song from the first seconds of a preview.',
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

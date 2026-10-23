import type { NextConfig } from 'next'

const config: NextConfig = {
  env: {
    // Always defined so the bundler can drop the Rivet client from a Cloudflare build.
    NEXT_PUBLIC_ROOM_BACKEND: process.env.NEXT_PUBLIC_ROOM_BACKEND === 'rivet' ? 'rivet' : 'cloudflare',
  },
}

export default config

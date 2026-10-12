'use client'

import NextError from 'next/error'
import { useEffect } from 'react'
import { captureGameException, posthogConfigured } from '@/analytics/posthog-client'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (posthogConfigured()) {
      captureGameException(error, { error_source: 'global_error' })
    }
  }, [error])

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  )
}

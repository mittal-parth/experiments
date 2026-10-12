import posthog from 'posthog-js'

export const DOODLE_BARS_EVENT_PREFIX = 'doodle_bars_'

export function prefixedEvent(name: string): string {
  const trimmed = name.trim()
  if (trimmed.startsWith(DOODLE_BARS_EVENT_PREFIX)) return trimmed
  return `${DOODLE_BARS_EVENT_PREFIX}${trimmed}`
}

export function posthogConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST)
}

type EventProps = Record<string, string | number | boolean>

const baseProps: EventProps = { app: 'doodle-bars' }

export function captureGameEvent(name: string, properties?: EventProps): void {
  if (!posthogConfigured()) return
  posthog.capture(prefixedEvent(name), { ...baseProps, ...properties })
}

export function captureGameException(error: unknown, properties?: EventProps): void {
  if (!posthogConfigured()) return
  posthog.captureException(error, { ...baseProps, ...properties })
}

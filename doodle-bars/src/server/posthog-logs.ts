import { SeverityNumber } from '@opentelemetry/api-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

function requiredPostHogEnvironment(): string | null {
  if (!token) return 'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN'
  if (!host) return 'NEXT_PUBLIC_POSTHOG_HOST'
  return null
}

const missingEnvironment = requiredPostHogEnvironment()

if (missingEnvironment && process.env.NODE_ENV !== 'production') {
  throw new Error(
    `${missingEnvironment} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingEnvironment} is configured`,
  )
}

export const posthogLogProvider =
  missingEnvironment || !token || !host
    ? null
    : new LoggerProvider({
        resource: resourceFromAttributes({ 'service.name': 'doodle-bars' }),
        processors: [
          new BatchLogRecordProcessor({
            exporter: new OTLPLogExporter({
              url: `${host}/i/v1/logs`,
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }),
          }),
        ],
      })

export const posthogLog = posthogLogProvider?.getLogger('doodle-bars-posthog') ?? null

export function logFixtureTone(message: string, attributes: Record<string, string>): void {
  posthogLog?.emit({ body: message, severityNumber: SeverityNumber.INFO, attributes })
}

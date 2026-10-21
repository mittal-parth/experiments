process.env.RIVET_PORT ??= '6420'
process.env.RIVET_RUN_SERVICES ??= '0'

const { registry } = await import('./src/rivet/registry')
const { startRunnerWatchdog } = await import('./src/server/runner-watchdog')

export {}

/** `registry.shutdown()` can hang when the link to Rivet is already dead. */
const SHUTDOWN_LIMIT_MS = 5_000

registry.start()

let stopping = false

// The envoy socket to Rivet has no client-side timeout. When it goes half-open, Rivet stops
// routing every room here while this process still looks alive to Docker. Exit so Docker's
// restart policy opens a fresh connection. Room state lives in Rivet and survives the exit.
const watchdog = startRunnerWatchdog({
  health: async () => {
    const response = await registry.routes.health()
    return { ok: response.status === 200, detail: `${response.status} ${await response.text()}` }
  },
  recycle: (reason) => {
    if (stopping) return
    stopping = true
    console.error(`runner unhealthy: ${reason}; exiting so the runner can restart`)
    const limit = new Promise<void>((resolve) => setTimeout(resolve, SHUTDOWN_LIMIT_MS))
    void Promise.race([registry.shutdown().catch(() => {}), limit]).finally(() => process.exit(1))
  },
})

async function shutdown(): Promise<void> {
  if (stopping) return
  stopping = true
  watchdog.stop()
  await registry.shutdown()
}

process.on('SIGINT', () => {
  void shutdown().then(() => process.exit(0))
})
process.on('SIGTERM', () => {
  void shutdown().then(() => process.exit(0))
})

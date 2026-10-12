process.env.RIVET_PORT ??= '6420'
process.env.RIVET_RUN_SERVICES ??= '0'

const { registry } = await import('./src/rivet/registry')

export {}

registry.start()

let stopping = false

async function shutdown(): Promise<void> {
  if (stopping) return
  stopping = true
  await registry.shutdown()
}

process.on('SIGINT', () => {
  void shutdown().then(() => process.exit(0))
})
process.on('SIGTERM', () => {
  void shutdown().then(() => process.exit(0))
})

// Rivet aborts every room start when the Node thread does not finish the startup
// callback within 30s. A manual docker restart clears that. If the loop is stuck
// for that long, exit so Docker's restart policy brings a fresh process up.
const LOOP_CHECK_MS = 5_000
const LOOP_LAG_LIMIT_MS = 30_000
let lastLoopTick = Date.now()
const loopWatch = setInterval(() => {
  const now = Date.now()
  const lag = now - lastLoopTick - LOOP_CHECK_MS
  lastLoopTick = now
  if (stopping || lag < LOOP_LAG_LIMIT_MS) return
  console.error(`event loop stalled for ${lag}ms; exiting so the runner can restart`)
  process.exit(1)
}, LOOP_CHECK_MS)
loopWatch.unref()

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

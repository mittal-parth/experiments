import { spawn, type ChildProcess } from 'node:child_process'
import net from 'node:net'

const sitePort = process.env.PORT ?? '3000'
const rivetPort = process.env.RIVET_PORT ?? '6420'
const runnerEnv = {
  ...process.env,
  RIVET_PORT: rivetPort,
  RIVET_RUN_SERVICES: process.env.RIVET_RUN_SERVICES ?? '0',
  NODE_OPTIONS: ['--conditions=react-server', process.env.NODE_OPTIONS].filter(Boolean).join(' '),
}

const runner = spawn('npx', ['tsx', 'runner.ts'], { stdio: 'inherit', env: runnerEnv })
let site: ChildProcess | null = null
let stopping = false

function stop(child: ChildProcess): void {
  if (child.exitCode !== null || child.signalCode !== null) return
  child.kill('SIGTERM')
}

function shutdown(code: number): void {
  if (stopping) return
  stopping = true
  stop(runner)
  if (site) stop(site)
  setTimeout(() => process.exit(code), 500)
}

runner.on('exit', (code) => {
  if (stopping) return
  shutdown(code ?? 1)
})

try {
  await waitForPort(Number(rivetPort), runner)
} catch (error) {
  shutdown(1)
  throw error
}

site = spawn('npx', ['next', 'dev', '--hostname', '127.0.0.1', '--port', sitePort], {
  stdio: 'inherit',
  env: process.env,
})
site.on('exit', (code) => {
  if (stopping) return
  shutdown(code ?? 1)
})
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

function waitForPort(port: number, child: ChildProcess): Promise<void> {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      if (child.exitCode !== null) {
        reject(new Error(`runner exited before port ${port} opened`))
        return
      }
      const socket = net.connect({ host: '127.0.0.1', port }, () => {
        socket.end()
        resolve()
      })
      socket.on('error', () => {
        socket.destroy()
        if (Date.now() - started > 30_000) {
          reject(new Error(`runner did not listen on ${port}`))
          return
        }
        setTimeout(tryOnce, 100)
      })
    }
    tryOnce()
  })
}

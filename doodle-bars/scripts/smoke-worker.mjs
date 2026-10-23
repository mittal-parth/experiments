// Usage: node scripts/smoke-worker.mjs [http://127.0.0.1:8787]
const base = process.argv[2] ?? 'http://127.0.0.1:8787'
const ws = base.replace(/^http/, 'ws')
const code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')
const playerId = crypto.randomUUID()

const created = await fetch(`${base}/room/${code}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ code, hostId: playerId, nickname: 'Smoke', playlistId: 'english', clipSeconds: 10, roundCount: 2, mode: 'solo', answer: 'song' }),
})
console.log('create', created.status, await created.text())
const again = await fetch(`${base}/room/${code}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
console.log('second create', again.status)

const open = (intent, id = playerId) =>
  new Promise((resolve) => {
    const socket = new WebSocket(`${ws}/room/${code}?playerId=${id}&intent=${intent}`)
    const events = []
    socket.onmessage = (e) => events.push(JSON.parse(e.data))
    socket.onopen = () => resolve({ socket, events })
  })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const a = await open('resume')
await wait(500)
console.log('first snapshot phase', a.events.at(-1)?.view?.phase)
a.socket.send(JSON.stringify({ type: 'start', msgId: 'm1', avoidTrackIds: [] }))
await wait(8000)
const view = a.events.findLast((m) => m.type === 'snapshot')?.view
console.log('after start phase', view?.phase, 'clip', view?.clip?.previewUrl?.slice(0, 60), 'errors', a.events.filter((m) => m.type === 'error'))
a.socket.close()
await wait(300)
const b = await open('resume')
await wait(500)
console.log('resumed phase', b.events.at(-1)?.view?.phase)
const ghost = await open('resume', 'nobody')
await wait(500)
console.log('ghost', ghost.events)
b.socket.send(JSON.stringify({ type: 'leave' }))
await wait(500)
console.log('leave', b.events.at(-1))
const gone = await open('resume')
await wait(500)
console.log('after leave', gone.events)
process.exit(0)

// Live Durable Object battle. Wrangler must already be listening.
// Usage: node scripts/battle-worker.mjs [http://127.0.0.1:8787]
import assert from 'node:assert/strict'

const base = process.argv[2] ?? 'http://127.0.0.1:8787'
const wsBase = base.replace(/^http/, 'ws')
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function codeOf() {
  return Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function createRoom(code, hostId) {
  const response = await fetch(`${base}/room/${code}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      code,
      hostId,
      nickname: 'Aman',
      playlistId: 'hindi',
      clipSeconds: 1,
      roundCount: 2,
      mode: 'room',
      answer: 'song',
    }),
  })
  const text = await response.text()
  assert.equal(response.status, 201, text)
}

class Seat {
  constructor(code, playerId, intent) {
    this.playerId = playerId
    this.events = []
    this.socket = new WebSocket(`${wsBase}/room/${code}?playerId=${encodeURIComponent(playerId)}&intent=${intent}`)
    this.socket.addEventListener('message', (event) => {
      this.events.push(JSON.parse(String(event.data)))
    })
    this.opened = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', () => resolve())
      this.socket.addEventListener('error', () => reject(new Error(`socket failed for ${playerId}`)))
    })
  }

  async ready() {
    await this.opened
    return this.view()
  }

  send(message) {
    this.socket.send(JSON.stringify(message))
  }

  latest() {
    return this.events.findLast((message) => message.type === 'snapshot')?.view ?? null
  }

  errors() {
    return this.events.flatMap((message) => (message.type === 'error' ? [message.message] : []))
  }

  async view(predicate, timeout = 8_000) {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      const view = this.latest()
      if (view && (predicate === undefined || predicate(view))) return view
      await wait(25)
    }
    throw new Error(
      `timed out for ${this.playerId}: ${JSON.stringify(this.latest())} errors ${JSON.stringify(this.errors())}`,
    )
  }

  async close() {
    if (this.socket.readyState === WebSocket.CLOSED) return 1000
    const closed = new Promise((resolve) => {
      this.socket.addEventListener('close', (event) => resolve(event.code))
    })
    this.socket.close(1000, 'battle')
    const code = await Promise.race([closed, wait(2_000).then(() => 'timeout')])
    assert.equal(code, 1000, `close code for ${this.playerId} was ${code}`)
    return code
  }
}

async function open(code, playerId, intent) {
  const seat = new Seat(code, playerId, intent)
  await seat.ready()
  return seat
}

async function join(code, nickname) {
  const playerId = crypto.randomUUID()
  const seat = new Seat(code, playerId, 'join')
  await seat.opened
  seat.send({ type: 'join', nickname })
  await seat.view((view) => view.you.nickname === nickname)
  return seat
}

async function seatedTrio() {
  const code = codeOf()
  const hostId = crypto.randomUUID()
  await createRoom(code, hostId)
  const host = await open(code, hostId, 'resume')
  const guests = []
  for (const nickname of ['Riya', 'Dev']) guests.push(await join(code, nickname))
  await host.view((view) => view.players.length === 3)
  return { code, host, guests }
}

const health = await fetch(`${base}/health`)
assert.equal(health.status, 200, 'worker health')

const { code, host, guests } = await seatedTrio()
console.log('seated', code)

host.send({ type: 'start', msgId: crypto.randomUUID(), avoidTrackIds: [] })
const playing = await host.view((view) => view.phase === 'playing')
assert.equal(playing.starting, false)
assert.equal(playing.roundEndsAt - playing.clipStartsAt, 2_000, 'clip 1s + grace 1s')
for (const seat of guests) {
  const view = await seat.view((item) => item.phase === 'playing')
  assert.equal(view.clipStartsAt, playing.clipStartsAt)
}
console.log('playing', playing.clipStartsAt)

const burst = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot']
const burstSeats = [guests[0], guests[1], host, guests[0], guests[1], host]
burstSeats.forEach((seat, index) => {
  seat.send({ type: 'guess', msgId: crypto.randomUUID(), text: burst[index] })
})
const afterBurst = await host.view(
  (view) => burst.every((text) => view.guesses.some((guess) => guess.text === text)),
  8_000,
)
assert.equal(afterBurst.phase, 'playing')
for (const seat of guests) {
  const view = await seat.view((item) => burst.every((text) => item.guesses.some((guess) => guess.text === text)))
  assert.deepEqual(
    view.guesses.map((guess) => guess.text).sort(),
    afterBurst.guesses.map((guess) => guess.text).sort(),
  )
}
console.log('burst kept', afterBurst.guesses.length)

const duplicateId = crypto.randomUUID()
guests[0].send({ type: 'guess', msgId: duplicateId, text: 'once' })
await host.view((view) => view.guesses.some((guess) => guess.text === 'once'))
guests[0].send({ type: 'guess', msgId: duplicateId, text: 'once' })
await wait(400)
const once = host.latest().guesses.filter((guess) => guess.text === 'once')
assert.equal(once.length, 1, 'duplicate msgId applied twice')
console.log('duplicate ignored')

const clipStartsAt = host.latest().clipStartsAt
await host.close()
const resumed = await open(code, host.playerId, 'resume')
const back = await resumed.view((view) => view.phase === 'playing')
assert.equal(back.clipStartsAt, clipStartsAt)
assert.equal(back.you.isHost, true)
await guests[0].view((view) => view.players.some((player) => player.id === host.playerId && player.connected))
console.log('host resumed same round')

const endsAt = back.roundEndsAt
for (const seat of [resumed, ...guests]) await seat.close()
const remain = endsAt - Date.now() + 1_500
if (remain > 0) await wait(remain)

const revealed = await open(code, host.playerId, 'resume')
const reveal = await revealed.view((view) => view.phase === 'reveal')
assert.equal(reveal.reveal?.title, 'Kesariya')
for (const text of [...burst, 'once']) {
  assert.equal(
    reveal.guesses.some((guess) => guess.text === text),
    true,
    `missing ${text} after the empty-room reveal`,
  )
}
assert.equal(
  reveal.guesses.some((guess) => guess.text === 'once' && reveal.guesses.filter((item) => item.text === 'once').length === 1),
  true,
)
const guestBack = []
for (const guest of guests) {
  const seat = await open(code, guest.playerId, 'resume')
  const view = await seat.view((item) => item.phase === 'reveal')
  assert.equal(view.reveal?.title, 'Kesariya')
  guestBack.push(seat)
}
console.log('alarm reveal with nobody connected')

revealed.send({ type: 'next', msgId: crypto.randomUUID(), roundNumber: 1 })
const round2 = await revealed.view((view) => view.phase === 'playing' && view.roundNumber === 2)
for (const seat of guestBack) {
  const view = await seat.view((item) => item.phase === 'playing' && item.roundNumber === 2)
  assert.equal(view.clipStartsAt, round2.clipStartsAt)
  assert.equal(view.reveal, null)
}
console.log('next round', round2.clipStartsAt)

guestBack[1].send({ type: 'guess', msgId: crypto.randomUUID(), text: 'Tum Hi Ho' })
for (const seat of [revealed, ...guestBack]) {
  const view = await seat.view((item) => item.phase === 'reveal' && item.reveal?.title === 'Tum Hi Ho')
  assert.equal(
    view.guesses.filter((guess) => guess.text === 'Tum Hi Ho').length,
    1,
  )
  assert.equal(seat.errors().includes('That round just ended'), false)
}
console.log('correct guess revealed everyone')

const rooms = await Promise.all(Array.from({ length: 4 }, () => seatedTrio()))
await Promise.all(
  rooms.map(async ({ host: roomHost }, index) => {
    roomHost.send({ type: 'start', msgId: crypto.randomUUID(), avoidTrackIds: [] })
    await roomHost.view((view) => view.phase === 'playing')
    roomHost.send({ type: 'guess', msgId: crypto.randomUUID(), text: `room-${index}` })
    const view = await roomHost.view((item) => item.guesses.some((guess) => guess.text === `room-${index}`))
    assert.deepEqual(
      view.guesses.map((guess) => guess.text),
      [`room-${index}`],
    )
  }),
)
console.log('four rooms stayed separate')

for (const seat of [revealed, ...guestBack]) {
  if (seat.socket.readyState === WebSocket.OPEN) seat.send({ type: 'leave' })
}
const leftAt = Date.now()
let status = 0
while (Date.now() - leftAt < 5_000) {
  status = (await fetch(`${base}/room/${code}`)).status
  if (status === 404) break
  await wait(50)
}
assert.equal(status, 404, 'room remains after the last leave')
for (const room of rooms) {
  for (const seat of [room.host, ...room.guests]) {
    if (seat.socket.readyState === WebSocket.OPEN) seat.send({ type: 'leave' })
  }
}
console.log('battle passed', code)

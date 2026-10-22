import { getPlaylist } from '@/catalog/registry'
import { cleanCode, cleanNickname } from '@/game/names'
import type { AnswerMode, RoomView } from '@/game/protocol'
import {
  abortStarting,
  advance,
  beginGame,
  configureRoom,
  createRoom,
  joinRoom,
  leaveRoom,
  markStarting,
  restart,
  setConnected,
  submitGuess,
  syncPhase,
  toView,
  type Room,
} from '@/game/room'
import { guessGraceSeconds } from '@/game/score'
import { loadRoundSongs, previewOptionsFromEnv } from '@/server/previews'
import { UserError, actor, event } from 'rivetkit'
import { MISSING_ROOM } from './errors'
import type { ActionCtx, ClockCtx, ConnParams, GameRoomInput, GameRoomState, RoomCtx } from './types'

const MSG_LIMIT = 32
const REAP_MS = 6 * 60 * 60 * 1000
const ACTION_TIMEOUT_MS = 120_000
const NEXT_FAILED = 'Could not start the next round. Try again.'

type RoomVars = {
  pendingMsgIds: Set<string>
}

/** One persisted room, keyed by its 4-character code. */
export const gameRoom = actor({
  options: { actionTimeout: ACTION_TIMEOUT_MS },
  events: {
    // This player's screen. Each connection gets its own view.
    snapshot: event<{ playerId: string; view: RoomView }>(),
    // A refusal for the connection that just tried something.
    error: event<{ message: string }>(),
    // This seat/player left. The payload is only an acknowledgement.
    left: event<{ ok: true }>(),
  },
  /**
   * Once, when the actor is first created. Returns the saved room.
   */
  createState: (c, input: GameRoomInput): GameRoomState => {
    // validate user nickname
    const nickname = cleanNickname(input.nickname)
    if (!nickname) throw new UserError('Use 2-16 letters or numbers')

    // fetch the selected playlist
    const playlist = getPlaylist(input.playlistId)
    if (!playlist) throw new UserError('Unknown playlist')

    // validate room code. room code is the actor key
    const code = cleanCode(c.key[0] ?? '')
    if (!code) throw new UserError('That room code is not valid')

    // initialize the room with initial details 
    return {
      room: createRoom({
        code,
        hostId: input.hostId,
        nickname,
        playlistId: playlist.id,
        playlistName: playlist.name,
        clipSeconds: input.clipSeconds,
        roundCount: input.roundCount,
        mode: input.mode,
        answer: input.answer,
      }),
      recentMsgIds: {},
      lastSeenAt: Date.now(),
    }
  },
  /**
   * Once, when the actor is first created and before any socket. Arms the idle timer.
   * Rivet keeps schedules across sleep and restarts, so no later wake arms it again. `_reap` re-arms itself.
   */
  onCreate: async (c) => {
    await c.schedule.after(REAP_MS, '_reap')
  },
  /** In-memory only. Lost on sleep. Holds in-flight `next` calls. */
  createVars: (): RoomVars => ({
    pendingMsgIds: new Set<string>(),
  }),
  /**
   * Every new socket. Saves `{ playerId, intent }` on that connection, not on the room.
   */
  createConnState: (_c, params: ConnParams): ConnParams => {
    const parsed = readParams(params)
    if (!parsed) throw new UserError('Join a room first')
    return parsed
  },
  /**
   * Every time the actor starts, including the first create, sleep, or a process restart.
   * Catches a finished round, and marks everyone away if no socket is open.
   * A room left in `starting` is put back in the lobby so a timed-out song load can be retried.
   *
   * Touches no SQLite. The browser socket waits on this hook and only gets 5 seconds
   * (`onConnectTimeout`). Timers do not need re-arming here because Rivet persists them.
   */
  onWake: (c) => {
    let room = currentRoom(c.state.room)
    let recentMsgIds: GameRoomState['recentMsgIds'] | null = null
    if (room.starting) {
      room = abortStarting(room)
      const ids = { ...c.state.recentMsgIds }
      delete ids[room.hostId]
      recentMsgIds = ids
    }
    if (c.conns.size === 0) {
      for (const player of room.players) {
        if (!player.connected) continue
        room = setConnected(room, player.id, false, Date.now())
      }
    }
    room = syncPhase(room, Date.now())
    c.state.room = room
    if (recentMsgIds) c.state.recentMsgIds = recentMsgIds
    if (typeof c.state.lastSeenAt !== 'number') c.state.lastSeenAt = Date.now()
  },
  /**
   * Before the socket is accepted. Resume is refused when that player has no seat.
   * `createConnState` only checks the shape of the params. This checks the room.
   */
  onBeforeConnect: (c, params: ConnParams) => {
    const parsed = readParams(params)
    if (!parsed) throw new UserError('Join a room first')
    if (parsed.intent === 'resume' && !c.state.room.players.some((player) => player.id === parsed.playerId)) {
      throw new UserError(MISSING_ROOM)
    }
  },
  /**
   * Socket is up. Marks a seated player present and sends each screen.
   * Does not touch `c.schedule`. Cancelling the idle timer here awaited SQLite on every reconnect.
   */
  onConnect: (c, conn) => {
    const playerId = conn.state.playerId
    const room = currentRoom(c.state.room)
    c.state.lastSeenAt = Date.now()
    if (room.players.some((player) => player.id === playerId)) {
      c.state.room = setConnected(room, playerId, true, Date.now())
    }
    pushViews(c)
  },
  /**
   * Socket dropped. Marks that player away unless another tab of theirs is still connected.
   * Does not delete the room. `leave` does that when the last seat is gone.
   */
  onDisconnect: (c, conn) => {
    const playerId = conn.state.playerId
    const stillThere = [...c.conns.values()].some(
      (other) => other.id !== conn.id && other.state.playerId === playerId,
    )
    if (stillThere) return
    c.state.lastSeenAt = Date.now()
    const room = currentRoom(c.state.room)
    if (!room.players.some((player) => player.id === playerId)) return
    c.state.room = setConnected(room, playerId, false, Date.now())
    pushViews(c)
  },
  actions: {
    /**
     * Seats this connection. If that player is already in the room, marks them present instead.
     */
    join: (c, nickname: string) => {
      const playerId = c.conn.state.playerId
      const room = currentRoom(c.state.room)
      if (room.players.some((player) => player.id === playerId)) {
        c.state.room = setConnected(room, playerId, true, Date.now())
        pushViews(c)
        return
      }
      const cleaned = cleanNickname(nickname)
      if (!cleaned) {
        fail(c, 'Use 2-16 letters or numbers')
        return
      }
      const joined = joinRoom(room, { id: playerId, nickname: cleaned })
      if (!joined.ok) {
        fail(c, joined.error)
        return
      }
      c.state.room = joined.room
      pushViews(c)
    },
    /**
     * Host updates the playlist, clip length, round count, or answer mode while the room is in the lobby.
     * A repeated `msgId` resends the current view and does not apply twice.
     */
    configure: (
      c,
      msgId: string,
      playlistId: string,
      clipSeconds: number,
      roundCount: number,
      answer: AnswerMode,
    ) => {
      const playerId = seated(c)
      if (!playerId) return
      if (duplicate(c, playerId, msgId)) {
        pushOne(c)
        return
      }
      const playlist = getPlaylist(playlistId)
      if (!playlist) {
        fail(c, 'Unknown playlist')
        return
      }
      const configured = configureRoom(
        currentRoom(c.state.room),
        playerId,
        playlist.id,
        playlist.name,
        clipSeconds,
        roundCount,
        answer,
      )
      if (!configured.ok) {
        fail(c, configured.error)
        return
      }
      remember(c, playerId, msgId)
      c.state.room = configured.room
      pushViews(c)
    },
    /**
     * Host starts the game. Keeps the actor awake while songs load, then schedules the round deadline.
     * Forgets `msgId` if loading fails so the same command can be retried.
     */
    start: async (c, msgId: string, avoidTrackIds: number[]) => {
      const playerId = seated(c)
      if (!playerId) return

      if (duplicate(c, playerId, msgId)) {
        pushOne(c)
        return
      }

      const marked = markStarting(currentRoom(c.state.room), playerId)
      if (!marked.ok) {
        fail(c, marked.error)
        return
      }
      remember(c, playerId, msgId)
      c.state.room = marked.room
      pushViews(c)

      const playlist = getPlaylist(marked.room.playlistId)
      if (!playlist) {
        forget(c, playerId, msgId)
        c.state.room = abortStarting(currentRoom(c.state.room))
        pushViews(c)
        fail(c, 'Unknown playlist')
        return
      }

      try {
        const songs = await c.keepAwake(
          loadRoundSongs(playlist, previewOptionsFromEnv(), marked.room.roundCount, trackIds(avoidTrackIds)),
        )

        const pending = currentRoom(c.state.room)
        if (!pending.starting) return
        if (songs.length === 0) {
          forget(c, playerId, msgId)
          c.state.room = abortStarting(pending)
          pushViews(c)
          fail(c, 'No previews for that playlist')
          return
        }

        const startedAt = Date.now()
        const grace = guessGraceSeconds()
        const begun = beginGame(pending, songs, startedAt, grace)
        if (!begun.ok) {
          forget(c, playerId, msgId)
          c.state.room = abortStarting(pending)
          pushViews(c)
          fail(c, begun.error)
          return
        }

        await scheduleRound(c, begun.room)
        // Rebuilt from the latest room so a join during the await is kept. Same `startedAt`, same deadline.
        const latest = currentRoom(c.state.room)
        if (!latest.starting) return
        const final = beginGame(latest, songs, startedAt, grace)
        c.state.room = final.ok ? final.room : begun.room
        pushViews(c)
      } catch (error) {
        const pending = currentRoom(c.state.room)
        if (pending.starting) {
          forget(c, playerId, msgId)
          c.state.room = abortStarting(pending)
          pushViews(c)
        }
        fail(c, error instanceof Error ? error.message : 'Could not load previews')
      }
    },
    /**
     * Records one guess. A repeated `msgId` re-sends the current view and does not score again.
     */
    guess: (c, msgId: string, text: string) => {
      const playerId = seated(c)
      if (!playerId) return
      if (duplicate(c, playerId, msgId)) {
        pushOne(c)
        return
      }
      const guessed = submitGuess(currentRoom(c.state.room), playerId, text, Date.now())
      if (!guessed.ok) {
        if (guessed.room) c.state.room = guessed.room
        pushViews(c)
        fail(c, guessed.error)
        return
      }
      remember(c, playerId, msgId)
      c.state.room = guessed.room
      pushViews(c)
    },
    /**
     * Advances to the next round when `roundNumber` is the one on screen, and schedules that round's deadline.
     * The room only moves on once the timer is stored, so a failed schedule can be retried with the same `msgId`.
     */
    next: async (c, msgId: string, roundNumber: number) => {
      const playerId = seated(c)
      if (!playerId) return
      if (duplicate(c, playerId, msgId) || !claim(c, playerId, msgId)) {
        pushOne(c)
        return
      }
      try {
        const stepped = advance(currentRoom(c.state.room), playerId, Date.now(), guessGraceSeconds(), roundNumber)
        if (!stepped.ok) {
          fail(c, stepped.error)
          return
        }
        try {
          await scheduleRound(c, stepped.room)
        } catch (error) {
          console.error('failed to schedule the round timer', error)
          fail(c, NEXT_FAILED)
          return
        }
        remember(c, playerId, msgId)
        c.state.room = stepped.room
        pushViews(c)
      } finally {
        release(c, playerId, msgId)
      }
    },
    /**
     * Host returns a finished game to the lobby. Songs and scores from the last game are cleared by `restart`.
     */
    restart: (c, msgId: string) => {
      const playerId = seated(c)
      if (!playerId) return
      if (duplicate(c, playerId, msgId)) {
        pushOne(c)
        return
      }
      const restarted = restart(currentRoom(c.state.room), playerId)
      if (!restarted.ok) {
        fail(c, restarted.error)
        return
      }
      remember(c, playerId, msgId)
      c.state.room = restarted.room
      pushViews(c)
    },
    /**
     * Removes this seat and tells that connection it left.
     * Destroys the actor when nobody remains.
     */
    leave: (c) => {
      const playerId = c.conn.state.playerId
      const next = leaveRoom(currentRoom(c.state.room), playerId, Date.now())
      c.conn.send('left', { ok: true })
      const ids = { ...c.state.recentMsgIds }
      delete ids[playerId]
      c.state.recentMsgIds = ids
      if (!next) {
        c.destroy()
        return
      }
      c.state.room = next
      pushViews(c)
    },
    /**
     * Rivet calls this when a scheduled round deadline fires. Not a browser action.
     * Timers are never cancelled, so a fire for another round or another game is ignored by
     * matching `endsAt`. Timers stored before `endsAt` was passed receive Rivet's fire info
     * in that slot instead of a number.
     */
    _onRoundDue: async (c, roundIndex: number, endsAt?: unknown) => {
      const room = currentRoom(c.state.room)
      if (room.phase !== 'playing' || room.roundIndex !== roundIndex || room.roundEndsAt === null) return
      if (typeof endsAt === 'number' && endsAt !== room.roundEndsAt) return
      if (Date.now() < room.roundEndsAt) {
        await scheduleRound(c, room)
        return
      }
      c.state.room = syncPhase(room, Date.now())
      pushViews(c)
    },
    /**
     * Rivet calls this when the idle timer fires.
     * A live socket, or a disconnect newer than 6 hours, arms it again. Otherwise the room is destroyed.
     * Connecting does not cancel this timer. That awaited SQLite on every reconnect.
     */
    _reap: async (c) => {
      const awake = c.conns.size > 0 || c.state.room.players.some((player) => player.connected)
      const idleFor = Date.now() - idleSince(c.state)
      if (!awake && idleFor >= REAP_MS) {
        c.destroy()
        return
      }
      const delay = awake ? REAP_MS : Math.max(0, REAP_MS - idleFor)
      await c.schedule.after(delay, '_reap')
    },
  },
})

/** Plain copy of the room. Rivet state is a proxy, and `structuredClone` on that proxy throws. */
function currentRoom(room: Room): Room {
  return JSON.parse(JSON.stringify(room)) as Room
}

/** Accepts `{ playerId, intent }` from a connect handshake. Returns null when the shape is wrong. */
function readParams(params: unknown): ConnParams | null {
  if (typeof params !== 'object' || params === null) return null
  if (!('playerId' in params) || typeof params.playerId !== 'string') return null
  if (params.playerId.length === 0 || params.playerId.length > 80) return null
  if (!('intent' in params) || (params.intent !== 'join' && params.intent !== 'resume')) return null
  return { playerId: params.playerId, intent: params.intent }
}

/** Player id for this connection when they have a seat. Otherwise sends "Join a room first". */
function seated(c: ActionCtx): string | null {
  const playerId = c.conn.state.playerId
  if (!c.state.room.players.some((player) => player.id === playerId)) {
    fail(c, 'Join a room first')
    return null
  }
  return playerId
}

function msgKey(playerId: string, msgId: string): string {
  return `${playerId}\0${msgId}`
}

/** Reserves `msgId` for the await below. False when this call is already in flight. An empty id is not reserved. */
function claim(c: { vars: { pendingMsgIds: Set<string> } }, playerId: string, msgId: string): boolean {
  if (!msgId) return true
  const key = msgKey(playerId, msgId)
  if (c.vars.pendingMsgIds.has(key)) return false
  c.vars.pendingMsgIds.add(key)
  return true
}

function release(c: { vars: { pendingMsgIds: Set<string> } }, playerId: string, msgId: string): void {
  if (!msgId) return
  c.vars.pendingMsgIds.delete(msgKey(playerId, msgId))
}

/** True when this player already applied `msgId`. An empty id is never treated as a repeat. */
function duplicate(c: { state: GameRoomState }, playerId: string, msgId: string): boolean {
  if (!msgId) return false
  return (c.state.recentMsgIds[playerId] ?? []).includes(msgId)
}

/** Stores `msgId` for this player, keeping the last 32. */
function remember(c: { state: GameRoomState }, playerId: string, msgId: string): void {
  if (!msgId) return
  const prior = c.state.recentMsgIds[playerId] ?? []
  const next = prior.filter((id) => id !== msgId)
  next.push(msgId)
  while (next.length > MSG_LIMIT) next.shift()
  c.state.recentMsgIds = { ...c.state.recentMsgIds, [playerId]: next }
}

/** Drops `msgId` so a failed start can be retried with the same id. */
function forget(c: { state: GameRoomState }, playerId: string, msgId: string): void {
  if (!msgId) return
  const prior = c.state.recentMsgIds[playerId]
  if (!prior) return
  c.state.recentMsgIds = {
    ...c.state.recentMsgIds,
    [playerId]: prior.filter((id) => id !== msgId),
  }
}

/** Positive integer track ids from the client, capped at 500, so a new round can avoid songs already played. */
function trackIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const ids: number[] = []
  for (const item of value) {
    if (typeof item !== 'number' || !Number.isInteger(item) || item <= 0) continue
    ids.push(item)
    if (ids.length > 500) ids.shift()
  }
  return ids
}

/** Sends each connection its own snapshot. Skips a connection that has no seat yet. */
function pushViews(c: RoomCtx): void {
  const room = currentRoom(c.state.room)
  for (const conn of c.conns.values()) {
    const view = toView(room, conn.state.playerId)
    if (!view) continue
    conn.send('snapshot', { playerId: conn.state.playerId, view })
  }
}

/** Sends the current snapshot to the connection that just called, used when a `msgId` is a repeat. */
function pushOne(c: ActionCtx): void {
  const view = toView(currentRoom(c.state.room), c.conn.state.playerId)
  if (!view) return
  c.conn.send('snapshot', { playerId: c.conn.state.playerId, view })
}

/** Sends an error event to the connection that just called. Other players do not see it. */
function fail(c: ActionCtx, message: string): void {
  c.conn.send('error', { message })
}

/** Milliseconds since the last socket. Rooms saved before `lastSeenAt` existed count as just seen. */
function idleSince(state: GameRoomState): number {
  return typeof state.lastSeenAt === 'number' ? state.lastSeenAt : Date.now()
}

/**
 * Stores this round's deadline in Rivet. Called once per round, from `start` and `next`.
 * `roundEndsAt` identifies the round, so a stale timer from an earlier round or game is ignored when it fires.
 */
async function scheduleRound(c: ClockCtx, room: Room): Promise<void> {
  if (room.phase !== 'playing' || room.roundEndsAt === null) return
  const delay = Math.max(0, room.roundEndsAt - Date.now())
  await c.schedule.after(delay, '_onRoundDue', room.roundIndex, room.roundEndsAt)
}

/**
 * Transport-neutral room orchestration for the Cloudflare backend.
 *
 * Mirrors `src/rivet/game-room.ts`: same hooks (wake, create, connect, actions, timers, reap),
 * but uses `RoomPlatform` instead of Rivet's `c.state`, `c.conns`, and `c.schedule`.
 *
 * Pure game rules stay in `src/game/room.ts`. Shared create/dedupe helpers in `room-service.ts`.
 */
import { getPlaylist } from '@/catalog/registry'
import { cleanNickname } from '@/game/names'
import type { ServerMessage } from '@/game/protocol'
import {
  abortStarting,
  advance,
  beginGame,
  configureRoom,
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
import {
  REAP_MS,
  RoomInputError,
  createInitialState,
  duplicate,
  forget,
  idleSince,
  remember,
  trackIds,
  type ConnParams,
  type GameRoomInput,
  type GameRoomState,
} from '@/game/room-service'
import { guessGraceSeconds } from '@/game/score'
import { loadRoundSongs, type PreviewOptions } from '@/server/previews'
import { MISSING_ROOM } from '@/rivet/errors'
import type { WireRequest } from './wire'

/** One open socket, as the host sees it. `id` is stable across a hibernation wake. */
export type RoomConn = {
  readonly id: string
  readonly playerId: string
  send: (message: ServerMessage) => void
}

/**
 * Runtime surface injected by the Durable Object (or by unit tests).
 * Keeps this module free of `cloudflare:workers` imports.
 */
export type RoomPlatform = {
  now: () => number
  conns: () => RoomConn[]
  save: (state: GameRoomState) => void
  /** Closes every socket, deletes storage and the alarm. */
  wipe: () => Promise<void>
  /** `null` clears the alarm. */
  setAlarm: (at: number | null) => void
  previewOptions: () => PreviewOptions
}

export type CreateResult = { ok: true } | { ok: false; status: 400 | 409; message: string }

/**
 * One room's rules and bookkeeping. The Durable Object owns sockets and storage and calls in here.
 */
export class RoomHost {
  private state: GameRoomState | null
  /** Last alarm time passed to `setAlarm`; avoids rewriting the alarm on every guess. */
  private armedAt: number | null = null

  constructor(
    private readonly platform: RoomPlatform,
    saved: GameRoomState | null,
  ) {
    this.state = saved
  }

  /** Whether this DO has been created (POST succeeded at least once). */
  exists(): boolean {
    return this.state !== null
  }

  /**
   * Runs once each time the object loads, including after eviction.
   *
   * - Room stuck in `starting` → lobby (retry song load).
   * - No open sockets → mark every seated player away.
   * - Playing past `roundEndsAt` → reveal via `syncPhase`.
   */
  wake(): void {
    const state = this.state
    if (!state) return
    const now = this.platform.now()
    let room = state.room
    let recentMsgIds = state.recentMsgIds
    if (room.starting) {
      room = abortStarting(room)
      const ids = { ...recentMsgIds }
      delete ids[room.hostId]
      recentMsgIds = ids
    }
    if (this.platform.conns().length === 0) {
      for (const player of room.players) {
        if (!player.connected) continue
        room = setConnected(room, player.id, false, now)
      }
    }
    room = syncPhase(room, now)
    if (recentMsgIds === state.recentMsgIds && JSON.stringify(room) === JSON.stringify(state.room)) {
      this.rearm()
      return
    }
    this.commit({
      ...state,
      room,
      recentMsgIds,
      lastSeenAt: typeof state.lastSeenAt === 'number' ? state.lastSeenAt : now,
    })
  }

  /**
   * First-time room creation (HTTP POST). Key must match the DO name (4-letter code).
   * @returns `409` if storage already has a room; `400` for validation errors.
   */
  create(input: GameRoomInput, key: string): CreateResult {
    if (this.state) return { ok: false, status: 409, message: 'That room code is already in use' }
    try {
      this.commit(createInitialState(input, key, this.platform.now()))
      return { ok: true }
    } catch (error) {
      if (error instanceof RoomInputError) return { ok: false, status: 400, message: error.message }
      throw error
    }
  }

  /**
   * Gate before the WebSocket is considered open (Rivet `onBeforeConnect`).
   * Sends `MISSING_ROOM` on the socket and returns false when resume has no seat.
   */
  admit(conn: RoomConn, params: ConnParams): boolean {
    const state = this.state
    if (!state || (params.intent === 'resume' && !state.room.players.some((p) => p.id === params.playerId))) {
      conn.send({ type: 'error', message: MISSING_ROOM })
      return false
    }
    return true
  }

  /**
   * Socket accepted (Rivet `onConnect`). Marks a seated player present and pushes snapshots.
   * Guests with `intent: join` are not seated until a wire `join` action runs.
   */
  connect(conn: RoomConn): void {
    const state = this.state
    if (!state) return
    const now = this.platform.now()
    let room = state.room
    if (room.players.some((player) => player.id === conn.playerId)) {
      room = setConnected(room, conn.playerId, true, now)
    }
    this.commit({ ...state, room, lastSeenAt: now })
    this.pushViews()
  }

  /**
   * Socket closed (Rivet `onDisconnect`). Same `playerId` on another `conn.id` keeps them "connected".
   */
  disconnect(conn: RoomConn): void {
    const state = this.state
    if (!state) return
    const stillThere = this.platform.conns().some((other) => other.id !== conn.id && other.playerId === conn.playerId)
    if (stillThere) return
    const now = this.platform.now()
    let room = state.room
    if (room.players.some((player) => player.id === conn.playerId)) {
      room = setConnected(room, conn.playerId, false, now)
    }
    this.commit({ ...state, room, lastSeenAt: now })
    this.pushViews()
  }

  /** Dispatch a parsed wire message from `webSocketMessage`. Caller identity is `conn.playerId`. */
  async message(conn: RoomConn, request: WireRequest): Promise<void> {
    const state = this.state
    if (!state) {
      conn.send({ type: 'error', message: MISSING_ROOM })
      return
    }
    switch (request.type) {
      case 'join':
        this.join(conn, request.nickname)
        return
      case 'configure':
        this.configure(conn, request)
        return
      case 'start':
        await this.start(conn, request.msgId, request.avoidTrackIds)
        return
      case 'guess':
        this.guess(conn, request.msgId, request.text)
        return
      case 'next':
        this.next(conn, request.msgId, request.roundNumber)
        return
      case 'restart':
        this.restartGame(conn, request.msgId)
        return
      case 'leave':
        await this.leave(conn)
        return
      default: {
        const unexpected: never = request
        throw new Error(`Unexpected value: ${JSON.stringify(unexpected)}`)
      }
    }
  }

  /**
   * Single DO alarm: round deadline reveal, then idle reap logic (Rivet `_onRoundDue` + `_reap`).
   * Always ends with `rearm()` unless the room was destroyed.
   */
  async alarm(): Promise<void> {
    this.armedAt = null
    const state = this.state
    if (!state) return
    const now = this.platform.now()
    const room = state.room
    if (room.phase === 'playing' && room.roundEndsAt !== null && now >= room.roundEndsAt) {
      this.commit({ ...state, room: syncPhase(room, now) })
      this.pushViews()
    }
    const current = this.requireState()
    const awake = this.platform.conns().length > 0 || current.room.players.some((player) => player.connected)
    if (awake) {
      // Something is live: push the 6h idle window forward (Rivet `_reap` with awake=true).
      this.commit({ ...current, lastSeenAt: now })
    } else if (now - idleSince(current) >= REAP_MS) {
      await this.destroy()
      return
    }
    this.rearm()
  }

  private join(conn: RoomConn, nickname: string): void {
    const room = this.room()
    const now = this.platform.now()
    if (room.players.some((player) => player.id === conn.playerId)) {
      this.setRoom(setConnected(room, conn.playerId, true, now))
      this.pushViews()
      return
    }
    const cleaned = cleanNickname(nickname)
    if (!cleaned) {
      this.fail(conn, 'Use 2-16 letters or numbers')
      return
    }
    const joined = joinRoom(room, { id: conn.playerId, nickname: cleaned })
    if (!joined.ok) {
      this.fail(conn, joined.error)
      return
    }
    this.setRoom(joined.room)
    this.pushViews()
  }

  private configure(conn: RoomConn, request: Extract<WireRequest, { type: 'configure' }>): void {
    const playerId = this.seated(conn)
    if (!playerId) return
    if (this.isDuplicate(playerId, request.msgId)) {
      this.pushOne(conn)
      return
    }
    const playlist = getPlaylist(request.playlistId)
    if (!playlist) {
      this.fail(conn, 'Unknown playlist')
      return
    }
    const configured = configureRoom(
      this.room(),
      playerId,
      playlist.id,
      playlist.name,
      request.clipSeconds,
      request.roundCount,
      request.answer,
    )
    if (!configured.ok) {
      this.fail(conn, configured.error)
      return
    }
    this.remember(playerId, request.msgId)
    this.setRoom(configured.room)
    this.pushViews()
  }

  /**
   * Host starts the game: mark starting, load iTunes previews (async), then `beginGame`.
   * On failure, `abortStart` clears `msgId` so the client can retry the same id.
   */
  private async start(conn: RoomConn, msgId: string, avoidTrackIds: number[]): Promise<void> {
    const playerId = this.seated(conn)
    if (!playerId) return
    if (this.isDuplicate(playerId, msgId)) {
      this.pushOne(conn)
      return
    }
    const marked = markStarting(this.room(), playerId)
    if (!marked.ok) {
      this.fail(conn, marked.error)
      return
    }
    this.remember(playerId, msgId)
    this.setRoom(marked.room)
    this.pushViews()

    const playlist = getPlaylist(marked.room.playlistId)
    if (!playlist) {
      this.abortStart(playerId, msgId)
      this.fail(conn, 'Unknown playlist')
      return
    }

    try {
      const songs = await loadRoundSongs(
        playlist,
        this.platform.previewOptions(),
        marked.room.roundCount,
        trackIds(avoidTrackIds),
      )
      const pending = this.stateOrNull()?.room
      if (!pending?.starting) return
      if (songs.length === 0) {
        this.abortStart(playerId, msgId)
        this.fail(conn, 'No previews for that playlist')
        return
      }
      const begun = beginGame(pending, songs, this.platform.now(), guessGraceSeconds())
      if (!begun.ok) {
        this.abortStart(playerId, msgId)
        this.fail(conn, begun.error)
        return
      }
      this.setRoom(begun.room)
      this.pushViews()
    } catch (error) {
      if (this.stateOrNull()?.room.starting) this.abortStart(playerId, msgId)
      this.fail(conn, error instanceof Error ? error.message : 'Could not load previews')
    }
  }

  private guess(conn: RoomConn, msgId: string, text: string): void {
    const playerId = this.seated(conn)
    if (!playerId) return
    if (this.isDuplicate(playerId, msgId)) {
      this.pushOne(conn)
      return
    }
    const guessed = submitGuess(this.room(), playerId, text, this.platform.now())
    if (!guessed.ok) {
      if (guessed.room) this.setRoom(guessed.room)
      this.pushViews()
      this.fail(conn, guessed.error)
      return
    }
    this.remember(playerId, msgId)
    this.setRoom(guessed.room)
    this.pushViews()
  }

  private next(conn: RoomConn, msgId: string, roundNumber: number): void {
    const playerId = this.seated(conn)
    if (!playerId) return
    if (this.isDuplicate(playerId, msgId)) {
      this.pushOne(conn)
      return
    }
    const stepped = advance(this.room(), playerId, this.platform.now(), guessGraceSeconds(), roundNumber)
    if (!stepped.ok) {
      this.fail(conn, stepped.error)
      return
    }
    this.remember(playerId, msgId)
    this.setRoom(stepped.room)
    this.pushViews()
  }

  private restartGame(conn: RoomConn, msgId: string): void {
    const playerId = this.seated(conn)
    if (!playerId) return
    if (this.isDuplicate(playerId, msgId)) {
      this.pushOne(conn)
      return
    }
    const restarted = restart(this.room(), playerId)
    if (!restarted.ok) {
      this.fail(conn, restarted.error)
      return
    }
    this.remember(playerId, msgId)
    this.setRoom(restarted.room)
    this.pushViews()
  }

  /** Removes the seat; destroys the DO when the last player leaves (Rivet `c.destroy`). */
  private async leave(conn: RoomConn): Promise<void> {
    const state = this.requireState()
    const next = leaveRoom(state.room, conn.playerId, this.platform.now())
    conn.send({ type: 'left' })
    const ids = { ...state.recentMsgIds }
    delete ids[conn.playerId]
    if (!next) {
      await this.destroy()
      return
    }
    this.commit({ ...state, room: next, recentMsgIds: ids })
    this.pushViews()
  }

  private async destroy(): Promise<void> {
    this.state = null
    this.armedAt = null
    await this.platform.wipe()
  }

  private abortStart(playerId: string, msgId: string): void {
    const state = this.stateOrNull()
    if (!state) return
    const holder = { state }
    forget(holder, playerId, msgId)
    this.commit({ ...holder.state, room: abortStarting(state.room) })
    this.pushViews()
  }

  private stateOrNull(): GameRoomState | null {
    return this.state
  }

  private requireState(): GameRoomState {
    if (!this.state) throw new Error(MISSING_ROOM)
    return this.state
  }

  private room(): Room {
    return this.requireState().room
  }

  private setRoom(room: Room): void {
    this.commit({ ...this.requireState(), room })
  }

  private isDuplicate(playerId: string, msgId: string): boolean {
    return duplicate({ state: this.requireState() }, playerId, msgId)
  }

  private remember(playerId: string, msgId: string): void {
    const holder = { state: this.requireState() }
    remember(holder, playerId, msgId)
    this.commit(holder.state)
  }

  /** Returns this connection's player id when they have a seat; otherwise sends an error. */
  private seated(conn: RoomConn): string | null {
    if (!this.room().players.some((player) => player.id === conn.playerId)) {
      this.fail(conn, 'Join a room first')
      return null
    }
    return conn.playerId
  }

  /** Persist, then schedule the next alarm if the deadline changed. */
  private commit(state: GameRoomState): void {
    this.state = state
    this.platform.save(state)
    this.rearm()
  }

  /**
   * One alarm covers both round end and idle reap: fire at min(roundEndsAt, lastSeenAt + REAP_MS).
   * Skips `setAlarm` when the target is unchanged (alarm writes cost money on the free tier).
   */
  private rearm(): void {
    const state = this.state
    if (!state) return
    const reapAt = idleSince(state) + REAP_MS
    const room = state.room
    const roundAt = room.phase === 'playing' ? room.roundEndsAt : null
    const target = roundAt !== null ? Math.min(roundAt, reapAt) : reapAt
    if (target === this.armedAt) return
    this.armedAt = target
    this.platform.setAlarm(target)
  }

  /** Fan out per-player views (Rivet `pushViews` / `snapshot` events). */
  private pushViews(): void {
    const room = this.stateOrNull()?.room
    if (!room) return
    for (const conn of this.platform.conns()) {
      const view = toView(room, conn.playerId)
      if (!view) continue
      conn.send({ type: 'snapshot', playerId: conn.playerId, view })
    }
  }

  /** Duplicate `msgId`: resend current view to the caller only (idempotent retries). */
  private pushOne(conn: RoomConn): void {
    const view = toView(this.room(), conn.playerId)
    if (!view) return
    conn.send({ type: 'snapshot', playerId: conn.playerId, view })
  }

  private fail(conn: RoomConn, message: string): void {
    conn.send({ type: 'error', message })
  }
}

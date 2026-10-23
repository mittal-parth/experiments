'use client'

import { onRoomLeave, onRoomViewChange, reportClientError, reportSessionHeartbeat } from '@/analytics/room-analytics'
import { useCallback, useEffect, useRef, useState } from 'react'
import { makeCode, makeId } from '@/game/ids'
import { cleanCode } from '@/game/names'
import type { AnswerMode, ClientMessage, RoomView } from '@/game/protocol'
import { createRoomClient } from '@/transport'
import { errorText, explainConnectError, isMissingActor, isTakenCode, MISSING_ROOM } from '@/rivet/errors'
import type { GameRoomInput } from '@/game/room-service'
import type { SongClient, SongConn } from '@/transport/types'

const SESSION_KEY = 'song-guesser-session'
const REPLY_TIMEOUT_MS = 8_000
const REPLY_TIMEOUT_ERROR = 'No response from the server. Try again.'
const RECONNECT_BACKOFF_INITIAL_MS = 1_000
const RECONNECT_BACKOFF_MAX_MS = 30_000
const UNBOUND_ERROR = 'Join a room first'
const STALE_ERRORS = new Set([REPLY_TIMEOUT_ERROR, UNBOUND_ERROR])

type Session = { code: string; playerId: string }

type Replay =
  | {
      type: 'configure'
      msgId: string
      playlistId: string
      clipSeconds: number
      roundCount: number
      answer: AnswerMode
    }
  | { type: 'start'; msgId: string; avoidTrackIds: number[] }
  | { type: 'guess'; msgId: string; text: string }
  | { type: 'next'; msgId: string; roundNumber: number }
  | { type: 'restart'; msgId: string }

function readStoredSession(): Session | null {
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const code = 'code' in parsed && typeof parsed.code === 'string' ? cleanCode(parsed.code) : null
    const playerId = 'playerId' in parsed && typeof parsed.playerId === 'string' ? parsed.playerId : null
    if (!code || !playerId) return null
    return { code, playerId }
  } catch {
    return null
  }
}

function rememberSession(code: string, playerId: string): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ code, playerId }))
}

function forgetSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

function syncRoomUrl(code: string, mode: RoomView['mode']): void {
  const url = new URL(window.location.href)
  if (mode === 'room') {
    if (url.searchParams.get('code') === code) return
    url.searchParams.set('code', code)
    window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`)
    return
  }
  if (!url.searchParams.has('code')) return
  url.searchParams.delete('code')
  const query = url.searchParams.toString()
  window.history.replaceState(null, '', query ? `${url.pathname}?${query}` : url.pathname)
}

function replayOf(message: ClientMessage): Replay | null {
  const msgId = makeId()
  switch (message.type) {
    case 'configure':
      return {
        type: 'configure',
        msgId,
        playlistId: message.playlistId,
        clipSeconds: message.clipSeconds,
        roundCount: message.roundCount,
        answer: message.answer,
      }
    case 'start':
      return { type: 'start', msgId, avoidTrackIds: message.avoidTrackIds }
    case 'guess':
      return { type: 'guess', msgId, text: message.text }
    case 'next':
      return { type: 'next', msgId, roundNumber: message.roundNumber }
    case 'restart':
      return { type: 'restart', msgId }
    case 'create':
    case 'join':
    case 'resume':
    case 'leave':
      return null
    default: {
      const unexpected: never = message
      throw new Error(`Unexpected value: ${JSON.stringify(unexpected)}`)
    }
  }
}

async function runReplay(conn: SongConn, command: Replay): Promise<void> {
  switch (command.type) {
    case 'configure':
      await conn.configure(command.msgId, command.playlistId, command.clipSeconds, command.roundCount, command.answer)
      return
    case 'start':
      await conn.start(command.msgId, command.avoidTrackIds)
      return
    case 'guess':
      await conn.guess(command.msgId, command.text)
      return
    case 'next':
      await conn.next(command.msgId, command.roundNumber)
      return
    case 'restart':
      await conn.restart(command.msgId)
      return
    default: {
      const unexpected: never = command
      throw new Error(`Unexpected value: ${JSON.stringify(unexpected)}`)
    }
  }
}

export function useRoom() {
  const [view, setView] = useState<RoomView | null>(null)
  const viewRef = useRef<RoomView | null>(null)
  viewRef.current = view
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(true)
  const [waiting, setWaiting] = useState(false)
  const clientRef = useRef<SongClient | null>(null)
  const connRef = useRef<SongConn | null>(null)
  const sessionRef = useRef<Session | null>(null)
  const intentRef = useRef<'join' | 'resume'>('resume')
  const joinNickRef = useRef<string | null>(null)
  const lastCommand = useRef<Replay | null>(null)
  const replayed = useRef(false)
  const acceptRef = useRef(true)
  const opening = useRef<Promise<void> | null>(null)
  const waitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectBackoffMs = useRef(RECONNECT_BACKOFF_INITIAL_MS)

  const clearWait = useCallback(() => {
    if (waitTimer.current) clearTimeout(waitTimer.current)
    waitTimer.current = null
    setWaiting(false)
  }, [])

  const armWait = useCallback(() => {
    setWaiting(true)
    if (waitTimer.current) clearTimeout(waitTimer.current)
    waitTimer.current = setTimeout(() => {
      waitTimer.current = null
      setWaiting(false)
      reportClientError(REPLY_TIMEOUT_ERROR, 'reply_timeout')
      setError(REPLY_TIMEOUT_ERROR)
      if (connRef.current?.connStatus !== 'connected') {
        const stale = connRef.current
        connRef.current = null
        if (stale) void stale.dispose()
        scheduleReconnectRef.current()
      }
    }, REPLY_TIMEOUT_MS)
  }, [])

  const dropSession = useCallback(
    (message: string) => {
      onRoomViewChange(null)
      reportClientError(message, 'session_dropped')
      sessionRef.current = null
      forgetSession()
      acceptRef.current = false
      clearWait()
      setView(null)
      setConnected(true)
      setError(message)
    },
    [clearWait],
  )

  const applySnapshot = useCallback(
    (payload: { playerId: string; view: RoomView }) => {
      if (!acceptRef.current) return
      intentRef.current = 'resume'
      joinNickRef.current = null
      sessionRef.current = { code: payload.view.code, playerId: payload.playerId }
      rememberSession(payload.view.code, payload.playerId)
      syncRoomUrl(payload.view.code, payload.view.mode)
      clearWait()
      setView(payload.view)
      onRoomViewChange(payload.view)
      setError((current) => (current !== null && STALE_ERRORS.has(current) ? null : current))
    },
    [clearWait],
  )

  const openConn = useCallback(async () => {
    if (opening.current) return opening.current
    const pending = connectCurrent()
    opening.current = pending
    try {
      await pending
    } finally {
      if (opening.current === pending) opening.current = null
    }
  }, [])

  const connectCurrent = useCallback(async () => {
    const session = sessionRef.current
    const client = clientRef.current
    if (!session || !client || !acceptRef.current) return
    const previous = connRef.current
    connRef.current = null
    if (previous) void previous.dispose()
    const intent = intentRef.current
    try {
      await client.gameRoom.get([session.code]).resolve()
    } catch (caught) {
      if (isMissingActor(caught)) {
        dropSession(MISSING_ROOM)
        return
      }
    }
    const conn = client.gameRoom.get([session.code]).connect({ playerId: session.playerId, intent })
    connRef.current = conn
    setConnected(false)
    conn.on('snapshot', (payload) => {
      if (connRef.current !== conn) return
      applySnapshot(payload)
    })
    conn.on('error', (payload) => {
      if (connRef.current !== conn) return
      if (payload.message === MISSING_ROOM) {
        dropSession(payload.message)
        return
      }
      reportClientError(payload.message, 'rivet_error')
      clearWait()
      setError(payload.message)
    })
    conn.on('left', () => {
      if (connRef.current !== conn) return
      onRoomViewChange(null)
      sessionRef.current = null
      forgetSession()
      clearWait()
      setView(null)
      setConnected(true)
    })
    conn.onStatusChange((status) => {
      if (connRef.current !== conn) return
      setConnected(status === 'connected')
      if (status === 'disconnected') replayed.current = false
      if (status === 'connected') {
        reconnectBackoffMs.current = RECONNECT_BACKOFF_INITIAL_MS
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current)
          reconnectTimer.current = null
        }
        const command = lastCommand.current
        if (command && !replayed.current) {
          replayed.current = true
          void runReplay(conn, command).catch(() => {})
        }
      }
    })
    conn.onError((caught) => {
      if (connRef.current !== conn) return
      const explained = explainConnectError(caught)
      if (explained) dropSession(explained)
    })
    try {
      await conn.ready
      if (connRef.current !== conn || !acceptRef.current) return
      const nickname = joinNickRef.current
      if (intent === 'join' && nickname) await conn.join(nickname)
    } catch (caught) {
      if (connRef.current !== conn) return
      const explained = explainConnectError(caught)
      if (explained) {
        dropSession(explained)
        return
      }
      const message = errorText(caught) || 'No response from the server. Try again.'
      reportClientError(message, 'connect_ready')
      clearWait()
      setError(message)
    }
  }, [applySnapshot, clearWait, dropSession])

  const reconnectNow = useCallback(() => {
    const session = sessionRef.current
    const conn = connRef.current
    if (!session || !acceptRef.current || !conn) return
    if (conn.connStatus === 'connected') return
    void openConn()
  }, [openConn])

  const openConnRef = useRef(openConn)
  const reconnectRef = useRef(reconnectNow)
  const scheduleReconnectRef = useRef(() => {})
  openConnRef.current = openConn
  reconnectRef.current = reconnectNow
  scheduleReconnectRef.current = () => {
    if (!sessionRef.current || !acceptRef.current || reconnectTimer.current || opening.current) return
    const delay = reconnectBackoffMs.current
    reconnectBackoffMs.current = Math.min(delay * 2, RECONNECT_BACKOFF_MAX_MS)
    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null
      void openConnRef.current()
    }, delay)
  }

  useEffect(() => {
    if (!view) return
    const id = setInterval(() => {
      const current = viewRef.current
      if (current) reportSessionHeartbeat(current)
    }, 60_000)
    return () => clearInterval(id)
  }, [view?.code])

  useEffect(() => {
    const client = createRoomClient()
    clientRef.current = client
    const stored = readStoredSession()
    const urlCode = cleanCode(new URLSearchParams(window.location.search).get('code') ?? '')
    if (stored && (!urlCode || urlCode === stored.code)) {
      sessionRef.current = stored
      intentRef.current = 'resume'
      setConnected(false)
      void openConnRef.current()
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      reconnectRef.current()
    }
    const onOnline = () => reconnectRef.current()
    window.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    window.addEventListener('pageshow', onOnline)
    return () => {
      window.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('pageshow', onOnline)
      if (waitTimer.current) clearTimeout(waitTimer.current)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      const conn = connRef.current
      connRef.current = null
      void conn?.dispose()
      void client.dispose()
    }
  }, [])

  const hostRoom = useCallback(
    async (message: Extract<ClientMessage, { type: 'create' }>) => {
      const client = clientRef.current
      if (!client) {
        clearWait()
        reportClientError(REPLY_TIMEOUT_ERROR, 'create_room_no_client')
        setError(REPLY_TIMEOUT_ERROR)
        return
      }
      const playerId = makeId()
      let lastError = 'Could not open a room'
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const code = makeCode()
        const input: GameRoomInput = {
          code,
          hostId: playerId,
          nickname: message.nickname,
          playlistId: message.playlistId,
          clipSeconds: message.clipSeconds,
          roundCount: message.roundCount,
          mode: message.mode,
          answer: message.answer,
        }
        try {
          await client.gameRoom.create([code], { input })
          sessionRef.current = { code, playerId }
          intentRef.current = 'resume'
          joinNickRef.current = null
          rememberSession(code, playerId)
          await openConn()
          return
        } catch (caught) {
          if (isTakenCode(caught)) continue
          lastError = errorText(caught) || lastError
          break
        }
      }
      clearWait()
      reportClientError(lastError, 'create_room')
      setError(lastError)
    },
    [clearWait, openConn],
  )

  const joinExisting = useCallback(
    async (message: Extract<ClientMessage, { type: 'join' }>) => {
      const code = cleanCode(message.code)
      if (!code) {
        clearWait()
        reportClientError('That room code is not valid', 'join_room')
        setError('That room code is not valid')
        return
      }
      const stored = readStoredSession()
      if (stored && stored.code === code) {
        sessionRef.current = stored
        intentRef.current = 'resume'
        joinNickRef.current = null
        await openConn()
        return
      }
      const playerId = makeId()
      sessionRef.current = { code, playerId }
      intentRef.current = 'join'
      joinNickRef.current = message.nickname
      await openConn()
    },
    [clearWait, openConn],
  )

  const send = useCallback(
    (message: ClientMessage) => {
      if (message.type === 'create' || message.type === 'join') acceptRef.current = true
      setError(null)
      switch (message.type) {
        case 'create':
          armWait()
          void hostRoom(message)
          return
        case 'join':
          armWait()
          void joinExisting(message)
          return
        case 'configure':
        case 'start':
        case 'guess':
        case 'next':
        case 'restart': {
          const command = replayOf(message)
          if (!command) return
          lastCommand.current = command
          armWait()
          const conn = connRef.current
          if (conn?.connStatus === 'connected') {
            replayed.current = true
            void runReplay(conn, command).catch(() => {})
            return
          }
          replayed.current = false
          return
        }
        case 'resume':
        case 'leave':
          return
        default: {
          const unexpected: never = message
          throw new Error(`Unexpected value: ${JSON.stringify(unexpected)}`)
        }
      }
    },
    [armWait, hostRoom, joinExisting],
  )

  const leave = useCallback(() => {
    onRoomLeave(viewRef.current)
    acceptRef.current = false
    const conn = connRef.current
    connRef.current = null
    sessionRef.current = null
    lastCommand.current = null
    joinNickRef.current = null
    forgetSession()
    clearWait()
    setError(null)
    setView(null)
    setConnected(true)
    if (conn && conn.connStatus === 'connected') {
      void conn.leave().finally(() => conn.dispose())
      return
    }
    void conn?.dispose()
  }, [clearWait])

  return { view, error, connected, waiting, send, leave }
}

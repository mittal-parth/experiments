'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { assertNever } from '@/game/assert-never'
import { cleanCode } from '@/game/names'
import {
  parseServerMessage,
  stampSession,
  type ClientMessage,
  type RoomView,
} from '@/game/protocol'

const SESSION_KEY = 'song-guesser-session'
const REPLY_TIMEOUT_MS = 8_000
const REPLY_TIMEOUT_ERROR = 'No response from the server. Try again.'
const UNBOUND_ERROR = 'Join a room first'
const STALE_ERRORS = new Set([REPLY_TIMEOUT_ERROR, UNBOUND_ERROR])

function socketUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/api/ws`
}

function readStoredSession(): { code: string; playerId: string } | null {
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

export function useRoom() {
  const [view, setView] = useState<RoomView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)
  const queueRef = useRef<ClientMessage[]>([])
  const sessionRef = useRef<{ code: string; playerId: string } | null>(null)
  const acceptRef = useRef(true)
  const waitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRoomCommand = useRef<ClientMessage | null>(null)
  const recovering = useRef(false)
  const recoveryUsed = useRef(false)
  const transmitRef = useRef<(message: ClientMessage) => void>(() => {})

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
      setError(REPLY_TIMEOUT_ERROR)
    }, REPLY_TIMEOUT_MS)
  }, [])

  useEffect(() => {
    let stopped = false
    let socket: WebSocket | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempt = 0

    const stored = readStoredSession()
    const urlCode = cleanCode(new URLSearchParams(window.location.search).get('code') ?? '')
    if (stored && (!urlCode || urlCode === stored.code)) sessionRef.current = stored

    const connect = () => {
      if (stopped) return
      const opened = new WebSocket(socketUrl())
      socket = opened
      socketRef.current = opened
      opened.onopen = () => {
        if (socketRef.current !== opened) return
        setConnected(true)
        attempt = 0
        const session = sessionRef.current
        if (session && acceptRef.current) {
          opened.send(JSON.stringify({ type: 'resume', ...session } satisfies ClientMessage))
        }
        const queued = queueRef.current
        queueRef.current = []
        for (const message of queued) {
          try {
            opened.send(JSON.stringify(message))
          } catch {
            queueRef.current.push(message)
          }
        }
      }
      opened.onmessage = (event) => {
        if (socketRef.current !== opened) return
        const message = parseServerMessage(typeof event.data === 'string' ? event.data : '')
        if (!message) return
        if (message.type === 'left') {
          sessionRef.current = null
          forgetSession()
          clearWait()
          setView(null)
          return
        }
        if (message.type === 'error') {
          if (message.message === 'That room is gone') {
            sessionRef.current = null
            forgetSession()
          }
          const session = sessionRef.current
          const retry = lastRoomCommand.current
          if (
            message.message === UNBOUND_ERROR &&
            session &&
            retry &&
            acceptRef.current &&
            !recoveryUsed.current
          ) {
            recoveryUsed.current = true
            recovering.current = true
            armWait()
            transmitRef.current({ type: 'resume', code: session.code, playerId: session.playerId })
            transmitRef.current(stampSession(retry, session))
            return
          }
          recovering.current = false
          clearWait()
          setError(message.message)
          return
        }
        if (!acceptRef.current) return
        sessionRef.current = { code: message.view.code, playerId: message.playerId }
        rememberSession(message.view.code, message.playerId)
        syncRoomUrl(message.view.code, message.view.mode)
        const resumeAck = recovering.current
        recovering.current = false
        if (!resumeAck) clearWait()
        setView(message.view)
        setError((current) => (current !== null && STALE_ERRORS.has(current) ? null : current))
      }
      opened.onclose = () => {
        if (socketRef.current !== opened) return
        setConnected(false)
        if (stopped || !acceptRef.current) return
        attempt += 1
        if (attempt <= 8) timer = setTimeout(connect, 400)
      }
    }

    connect()
    return () => {
      stopped = true
      clearTimeout(timer)
      if (waitTimer.current) clearTimeout(waitTimer.current)
      socket?.close()
    }
  }, [armWait, clearWait])

  const transmit = useCallback((message: ClientMessage) => {
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message))
        return
      } catch {
        // The socket closed between the check and the write. Queue it for the next open.
      }
    }
    queueRef.current.push(message)
  }, [])
  transmitRef.current = transmit

  const send = useCallback((message: ClientMessage) => {
    if (message.type === 'create' || message.type === 'join') acceptRef.current = true
    setError(null)
    recoveryUsed.current = false
    switch (message.type) {
      case 'configure':
      case 'start':
      case 'guess':
      case 'next':
      case 'restart':
        lastRoomCommand.current = message
        break
      case 'create':
      case 'join':
      case 'resume':
      case 'leave':
        break
      default:
        assertNever(message)
    }
    armWait()
    transmit(stampSession(message, sessionRef.current))
  }, [armWait, transmit])

  const leave = useCallback(() => {
    acceptRef.current = false
    sessionRef.current = null
    forgetSession()
    clearWait()
    setError(null)
    setView(null)
    transmit({ type: 'leave' })
  }, [clearWait, transmit])

  return { view, error, connected, waiting, send, leave }
}

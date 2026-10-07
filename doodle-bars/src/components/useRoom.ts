'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cleanCode } from '@/game/names'
import {
  parseServerMessage,
  type ClientMessage,
  type RoomView,
} from '@/game/protocol'

const SESSION_KEY = 'song-guesser-session'

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
  const socketRef = useRef<WebSocket | null>(null)
  const queueRef = useRef<ClientMessage[]>([])
  const sessionRef = useRef<{ code: string; playerId: string } | null>(null)
  const acceptRef = useRef(true)

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
      socket = new WebSocket(socketUrl())
      socketRef.current = socket
      socket.onopen = () => {
        setConnected(true)
        attempt = 0
        const session = sessionRef.current
        if (session && acceptRef.current) {
          socket?.send(JSON.stringify({ type: 'resume', ...session } satisfies ClientMessage))
        }
        const queued = queueRef.current
        queueRef.current = []
        for (const message of queued) {
          socket?.send(JSON.stringify(message))
        }
      }
      socket.onmessage = (event) => {
        const message = parseServerMessage(typeof event.data === 'string' ? event.data : '')
        if (!message) return
        if (message.type === 'left') {
          sessionRef.current = null
          forgetSession()
          setView(null)
          return
        }
        if (message.type === 'error') {
          if (message.message === 'That room is gone') {
            sessionRef.current = null
            forgetSession()
          }
          setError(message.message)
          return
        }
        if (!acceptRef.current) return
        sessionRef.current = { code: message.view.code, playerId: message.playerId }
        rememberSession(message.view.code, message.playerId)
        syncRoomUrl(message.view.code, message.view.mode)
        setView(message.view)
        setError(null)
      }
      socket.onclose = () => {
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
      socket?.close()
    }
  }, [])

  const send = useCallback((message: ClientMessage) => {
    if (message.type === 'create' || message.type === 'join') acceptRef.current = true
    setError(null)
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
      return
    }
    queueRef.current.push(message)
  }, [])

  const leave = useCallback(() => {
    acceptRef.current = false
    sessionRef.current = null
    forgetSession()
    setView(null)
    send({ type: 'leave' })
  }, [send])

  return { view, error, connected, send, leave }
}

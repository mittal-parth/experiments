'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  parseServerMessage,
  type ClientMessage,
  type RoomView,
} from '@/game/protocol'

function socketUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/api/ws`
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
          setView(null)
          return
        }
        if (message.type === 'error') {
          setError(message.message)
          return
        }
        if (!acceptRef.current) return
        sessionRef.current = { code: message.view.code, playerId: message.playerId }
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
    setView(null)
    send({ type: 'leave' })
  }, [send])

  return { view, error, connected, send, leave }
}

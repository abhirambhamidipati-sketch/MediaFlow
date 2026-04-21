import { useCallback, useEffect, useRef, useState } from 'react'

// Derive the WebSocket endpoint from the same env variable used by axios so
// there is exactly one place to change the backend target.
//
// When VITE_API_BASE_URL is set:
//   https://example.com  →  wss://example.com/ws/news/
//   http://example.com   →  ws://example.com/ws/news/
//
// When VITE_API_BASE_URL is absent (pure local dev):
//   falls back to the current browser origin → Vite proxy handles /ws/*
function buildWsUrl() {
  const apiBase = import.meta.env.VITE_API_BASE_URL
  if (apiBase) {
    return apiBase.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://') + '/ws/news/'
  }
  // Dev without env var: let Vite proxy upgrade and forward to localhost:8000
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/news/`
}

const WS_URL = buildWsUrl()
const RECONNECT_DELAY = 3000
const MAX_RECONNECTS  = 10

export function useWebSocket(onMessage) {
  const [connected,  setConnected]  = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [retrying,   setRetrying]   = useState(false)
  const wsRef           = useRef(null)
  const reconnectCount  = useRef(0)
  const reconnectTimer  = useRef(null)
  const onMessageRef    = useRef(onMessage)
  onMessageRef.current  = onMessage

  const connect = useCallback(() => {
    if (!localStorage.getItem('access')) return

    setConnecting(true)
    setRetrying(false)

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[MF WS] connected to', WS_URL)
      setConnected(true)
      setConnecting(false)
      setRetrying(false)
      reconnectCount.current = 0
    }

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)
        onMessageRef.current?.(data)
      } catch { /* ignore malformed frames */ }
    }

    ws.onclose = (evt) => {
      console.warn('[MF WS] closed — code:', evt.code, 'reason:', evt.reason || '(none)')
      setConnected(false)
      setConnecting(false)
      if (reconnectCount.current < MAX_RECONNECTS) {
        reconnectCount.current++
        setRetrying(true)
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY)
      } else {
        setRetrying(false)
      }
    }

    ws.onerror = (e) => {
      console.error('[MF WS] error', e)
      ws.close()
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { connected, connecting, retrying }
}

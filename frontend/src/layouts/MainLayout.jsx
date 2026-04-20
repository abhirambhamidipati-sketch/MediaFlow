import { Outlet } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { ToastContainer } from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'
import { useWebSocket } from '../hooks/useWebSocket'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useCallback, useState } from 'react'

const WsContext = createContext({ connected: false, lastEvent: null })
export const useWsContext = () => useContext(WsContext)

export function MainLayout() {
  const qc = useQueryClient()
  const { toasts, toast, dismiss } = useToast()
  const [lastEvent, setLastEvent] = useState(null)

  const handleWsMessage = useCallback((data) => {
    setLastEvent(data)
    if (data.type === 'new_news') {
      toast(`New article: "${data.title}"`, 'info', 5000)
      qc.invalidateQueries({ queryKey: ['news'] })
      qc.invalidateQueries({ queryKey: ['trending'] })
    }
    if (data.type === 'new_comment') {
      qc.invalidateQueries({ queryKey: ['comments', data.news_id] })
      qc.invalidateQueries({ queryKey: ['news', data.news_id] })
    }
  }, [qc, toast])

  const { connected, connecting, retrying } = useWebSocket(handleWsMessage)

  return (
    <WsContext.Provider value={{ connected, connecting, retrying, lastEvent }}>
      <div className="min-h-screen bg-slate-950">
        {/* Subtle gradient orbs in background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        </div>

        <Navbar wsConnected={connected} wsConnecting={connecting} wsRetrying={retrying} />
        <main className="max-w-6xl mx-auto px-4 py-6">
          <Outlet />
        </main>
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    </WsContext.Provider>
  )
}

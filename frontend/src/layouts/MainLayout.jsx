import { createContext, useContext, useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { MobileHeader } from '../components/Navbar'
import { ToastContainer } from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'
import { useWebSocket } from '../hooks/useWebSocket'
import { useQueryClient } from '@tanstack/react-query'

const WsContext = createContext({ connected: false, connecting: false, retrying: false, lastEvent: null })
export const useWsContext = () => useContext(WsContext)

export function MainLayout() {
  const qc = useQueryClient()
  const { toasts, toast, dismiss } = useToast()
  const [lastEvent, setLastEvent] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleWsMessage = useCallback((data) => {
    setLastEvent(data)
    if (data.type === 'new_news') {
      toast(`"${data.title}" was just published`, 'info', 5000)
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
      <div className="min-h-screen" style={{ backgroundColor: '#09090f' }}>

        {/* Left sidebar — fixed, desktop always visible, mobile toggle */}
        <Sidebar
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Mobile top bar */}
        <MobileHeader onMenuOpen={() => setSidebarOpen(true)} />

        {/* Content — offset by sidebar width on desktop */}
        <div className="lg:pl-[232px] min-h-screen flex flex-col">
          <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-6 pt-[60px] lg:pt-6">
            <Outlet />
          </main>
        </div>

        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    </WsContext.Provider>
  )
}

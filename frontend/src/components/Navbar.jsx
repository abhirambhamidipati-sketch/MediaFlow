import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleColor } from '../utils/formatters'

function WsStatus({ connected, connecting, retrying }) {
  if (connected) {
    return (
      <span className="hidden sm:flex items-center gap-1.5 text-xs text-green-400" title="Live updates active">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Live
      </span>
    )
  }
  if (connecting) {
    return (
      <span className="hidden sm:flex items-center gap-1.5 text-xs text-yellow-400/80" title="Establishing connection…">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/80 animate-pulse" />
        Connecting…
      </span>
    )
  }
  if (retrying) {
    return (
      <span className="hidden sm:flex items-center gap-1.5 text-xs text-orange-400/70" title="Reconnecting…">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400/70" />
        Disconnected (retrying)
      </span>
    )
  }
  return (
    <span className="hidden sm:flex items-center gap-1.5 text-xs text-white/25" title="Offline">
      <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
      Offline
    </span>
  )
}

export function Navbar({ wsConnected, wsConnecting, wsRetrying }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navLink = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-150 ${isActive ? 'text-violet-400' : 'text-white/60 hover:text-white'}`

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl bg-slate-950/80">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs">M</span>
          <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">MediaFlow</span>
        </Link>

        {/* Nav links */}
        {user && (
          <nav className="hidden md:flex items-center gap-5">
            <NavLink to="/" className={navLink} end>Feed</NavLink>
            <NavLink to="/trending" className={navLink}>Trending</NavLink>
            {(user.role === 'contributor' || user.role === 'admin') && user.is_verified && (
              <NavLink to="/create" className={navLink}>Write</NavLink>
            )}
            {user.role === 'admin' && (
              <NavLink to="/admin" className={navLink}>Admin</NavLink>
            )}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* WS indicator */}
          {user && (
            <WsStatus connected={wsConnected} connecting={wsConnecting} retrying={wsRetrying} />
          )}

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/8 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                  {user.username[0].toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm text-white/80">{user.username}</span>
                <span className={`badge-role ${roleColor(user.role)}`}>{user.role}</span>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-1 w-52 glass py-1.5 z-50 animate-slide-in"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <Link to="/dashboard" className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors" onClick={() => setMenuOpen(false)}>
                    Dashboard
                  </Link>
                  {user.role === 'viewer' && (
                    <Link to="/apply" className="block px-4 py-2 text-sm text-violet-400 hover:text-violet-300 hover:bg-white/5 transition-colors" onClick={() => setMenuOpen(false)}>
                      Become a Contributor
                    </Link>
                  )}
                  <hr className="my-1 border-white/10" />
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
                    onClick={handleLogout}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-ghost text-sm px-3 py-1.5">Sign in</Link>
              <Link to="/register" className="btn-primary text-sm px-3 py-1.5">Sign up</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleColor } from '../utils/formatters'
import { useWsContext } from '../layouts/MainLayout'
import logoSrc from '../assets/logo.svg'

/* ── Inline SVG icons (Heroicons outline style) ──────────────────── */
function IconHome() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 3l9 9"/>
      <path d="M9 21V12h6v9"/>
      <path d="M5 10v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10"/>
    </svg>
  )
}

function IconTrending() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </svg>
  )
}

function IconPen() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function IconGrid() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}

function IconStar() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

/* ── WebSocket status dot ─────────────────────────────────────────── */
function WsDot({ connected, connecting, retrying }) {
  if (connected) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-400/80">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse block" />
        Live
      </div>
    )
  }
  if (connecting) {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-400/70">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-pulse block" />
        Connecting…
      </div>
    )
  }
  if (retrying) {
    return (
      <div className="flex items-center gap-2 text-xs text-orange-400/60">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400/60 block" />
        Reconnecting…
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-xs text-white/20">
      <span className="w-1.5 h-1.5 rounded-full bg-white/15 block" />
      Offline
    </div>
  )
}

/* ── Sidebar component ────────────────────────────────────────────── */
export function Sidebar({ mobileOpen, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { connected, connecting, retrying } = useWsContext()

  const canWrite = user && (user.role === 'admin' || (user.role === 'contributor' && user.is_verified))
  const isAdmin  = user?.role === 'admin'
  const isViewer = user?.role === 'viewer'

  const navItems = [
    { to: '/', label: 'Feed',      icon: <IconHome />,     end: true,  show: true },
    { to: '/trending', label: 'Trending', icon: <IconTrending />, end: false, show: true },
    { to: '/create',   label: 'Write',    icon: <IconPen />,      end: false, show: canWrite },
    { to: '/dashboard',label: 'Dashboard',icon: <IconGrid />,     end: false, show: true },
    { to: '/apply',    label: 'Go Pro',   icon: <IconStar />,     end: false, show: isViewer },
    { to: '/admin',    label: 'Admin',    icon: <IconSettings />, end: false, show: isAdmin },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navLinkClass = ({ isActive }) =>
    `nav-item ${isActive ? 'active' : ''}`

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-[232px] flex flex-col',
          'bg-[#0a0a12] border-r border-white/[0.055]',
          'transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="h-[60px] flex items-center px-5 border-b border-white/[0.05] shrink-0">
          <Link to="/" className="logo-link flex items-center" onClick={onClose}>
            <img src={logoSrc} alt="MediaFlow" className="h-[28px] w-auto transition-all duration-250" />
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20 px-3 mb-2 mt-1">
            Menu
          </p>
          {navItems.filter((n) => n.show).map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={navLinkClass}
              onClick={onClose}
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        {/* WS status */}
        <div className="px-5 pb-2">
          <WsDot connected={connected} connecting={connecting} retrying={retrying} />
        </div>

        {/* User profile row */}
        <div className="px-3 pb-4 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-300 shrink-0">
              {user?.username?.[0]?.toUpperCase() ?? '?'}
            </div>

            {/* Name + role */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white/85 truncate">{user?.username}</p>
              <p className="text-[11px] text-white/35 capitalize">{user?.role}</p>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-white/25 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10"
            >
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

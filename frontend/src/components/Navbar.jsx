import { Link } from 'react-router-dom'

/* ── Hamburger icon ───────────────────────────────────────────────── */
function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="3" y1="6"  x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

/**
 * MobileHeader — shown only on < lg screens.
 * Desktop navigation lives entirely in Sidebar.jsx.
 */
export function MobileHeader({ onMenuOpen }) {
  return (
    <header className="lg:hidden fixed top-0 inset-x-0 z-20 h-[60px] flex items-center justify-between px-4
                       bg-[#0B0B0F]/90 backdrop-blur-xl border-b border-white/[0.06]">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-xs text-white">
          M
        </div>
        <span className="font-semibold text-white text-[15px] tracking-tight">MediaFlow</span>
      </Link>

      {/* Hamburger */}
      <button
        onClick={onMenuOpen}
        className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors"
        aria-label="Open menu"
      >
        <IconMenu />
      </button>
    </header>
  )
}

/**
 * Navbar — kept for any direct imports elsewhere.
 * On desktop it renders nothing; on mobile it delegates to MobileHeader.
 * Pass wsConnected/wsConnecting/wsRetrying for backwards compatibility —
 * WS status is now shown in the Sidebar instead.
 */
export function Navbar({ onMenuOpen }) {
  return <MobileHeader onMenuOpen={onMenuOpen ?? (() => {})} />
}

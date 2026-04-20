import { Link } from 'react-router-dom'
import logoSrc from '../assets/logo.svg'

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="3" y1="6"  x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

export function MobileHeader({ onMenuOpen }) {
  return (
    <header className="lg:hidden fixed top-0 inset-x-0 z-20 h-[60px] flex items-center justify-between px-4
                       bg-[#09090f]/92 backdrop-blur-xl border-b border-white/[0.055]">
      <Link to="/" className="logo-link flex items-center">
        <img src={logoSrc} alt="MediaFlow" className="h-[26px] w-auto" />
      </Link>
      <button
        onClick={onMenuOpen}
        className="p-2 rounded-xl text-white/45 hover:text-white hover:bg-white/[0.05] transition-colors"
        aria-label="Open menu"
      >
        <IconMenu />
      </button>
    </header>
  )
}

export function Navbar({ onMenuOpen }) {
  return <MobileHeader onMenuOpen={onMenuOpen ?? (() => {})} />
}

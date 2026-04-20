import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GoogleLoginButton } from '../components/GoogleLoginButton'
import { extractError } from '../utils/formatters'

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

const FEATURES = [
  'Real-time news via WebSocket',
  'AI-powered content aggregation',
  'Contributor publishing tools',
  'Bookmark and personalise your feed',
]

export default function LoginPage() {
  const { login, googleLogin } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]       = useState({ username: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(extractError(err) || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex">

      {/* ── Left branding panel ─────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 px-14 py-12 bg-[#0a0a12] border-r border-white/[0.06] relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-700/6 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-indigo-500/8 rounded-full blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center font-bold text-white text-sm">
            M
          </div>
          <span className="font-semibold text-white text-lg tracking-tight">MediaFlow</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-[38px] font-bold text-white leading-[1.15] tracking-tight mb-4">
              Your real-time<br />news platform.
            </h1>
            <p className="text-white/45 text-[15px] leading-relaxed">
              Stay ahead with live updates, intelligent aggregation, and community-driven content — all in one place.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-[22px] h-[22px] rounded-full bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
                  <CheckIcon />
                </div>
                <span className="text-white/55 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-white/20 text-xs relative z-10">© 2025 MediaFlow. All rights reserved.</p>
      </div>

      {/* ── Right form panel ─────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[380px] animate-fade-in">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10 justify-center">
            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center font-bold text-white text-sm">M</div>
            <span className="font-semibold text-white text-[17px] tracking-tight">MediaFlow</span>
          </div>

          <h2 className="text-[26px] font-bold text-white mb-1 tracking-tight">Welcome back</h2>
          <p className="text-white/40 text-sm mb-8">Sign in to continue to MediaFlow</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/55 text-[13px] font-medium mb-1.5">Username</label>
              <input
                className="input-field"
                placeholder="Enter your username"
                autoComplete="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-white/55 text-[13px] font-medium mb-1.5">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-2.5 mt-1" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center my-5">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="px-3 text-white/25 text-xs">or continue with</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          <GoogleLoginButton
            onSuccess={async (credential) => {
              setError('')
              setLoading(true)
              try {
                await googleLogin(credential)
                navigate('/')
              } catch (err) {
                setError(extractError(err) || 'Google sign-in failed')
              } finally {
                setLoading(false)
              }
            }}
            onError={(msg) => setError(msg || 'Google sign-in failed')}
          />

          <p className="text-center text-white/35 text-sm mt-7">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

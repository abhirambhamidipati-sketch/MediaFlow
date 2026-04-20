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

const PERKS = [
  'Free forever — no credit card needed',
  'Real-time feed with WebSocket updates',
  'Bookmark and personalise your reading',
  'Apply to become a contributor',
]

export default function RegisterPage() {
  const { register, googleLogin } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]       = useState({ username: '', email: '', password: '', confirm: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setError('')
    setLoading(true)
    try {
      await register(form.username, form.password, form.email)
      navigate('/')
    } catch (err) {
      setError(extractError(err) || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const field = (key, label, type = 'text', placeholder = '', required = true) => (
    <div>
      <label className="block text-white/55 text-[13px] font-medium mb-1.5">
        {label}
        {!required && <span className="text-white/25 ml-1">(optional)</span>}
      </label>
      <input
        type={type}
        className="input-field"
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        required={required}
        autoComplete={type === 'password' ? 'new-password' : undefined}
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex">

      {/* ── Left branding panel ─────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 px-14 py-12 bg-[#0a0a12] border-r border-white/[0.06] relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-700/6 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center font-bold text-white text-sm">M</div>
          <span className="font-semibold text-white text-lg tracking-tight">MediaFlow</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-[38px] font-bold text-white leading-[1.15] tracking-tight mb-4">
              Join the next<br />generation of news.
            </h1>
            <p className="text-white/45 text-[15px] leading-relaxed">
              Create your free account and access a smarter, faster, and more personalised news experience.
            </p>
          </div>

          <div className="space-y-3">
            {PERKS.map((p) => (
              <div key={p} className="flex items-center gap-3">
                <div className="w-[22px] h-[22px] rounded-full bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
                  <CheckIcon />
                </div>
                <span className="text-white/55 text-sm">{p}</span>
              </div>
            ))}
          </div>
        </div>

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

          <h2 className="text-[26px] font-bold text-white mb-1 tracking-tight">Create account</h2>
          <p className="text-white/40 text-sm mb-8">It&apos;s free and only takes a minute</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {field('username', 'Username',         'text',     'Choose a username')}
            {field('email',    'Email',             'email',    'your@email.com', false)}
            {field('password', 'Password',          'password', 'At least 6 characters')}
            {field('confirm',  'Confirm password',  'password', 'Repeat your password')}

            {error && (
              <div className="text-red-400 text-sm bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-2.5 mt-1" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : 'Create account'}
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
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

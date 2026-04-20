import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GoogleLoginButton } from '../components/GoogleLoginButton'
import { extractError } from '../utils/formatters'

export default function RegisterPage() {
  const { register, googleLogin } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
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

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-white/60 text-sm mb-1.5">{label}</label>
      <input
        type={type}
        className="input-field"
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        required={key !== 'email'}
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="glass p-8 w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xl font-bold mx-auto mb-4">M</div>
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="text-white/40 text-sm mt-1">Join MediaFlow today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {field('username', 'Username', 'text', 'Choose a username')}
          {field('email', 'Email (optional)', 'email', 'your@email.com')}
          {field('password', 'Password', 'password', 'At least 6 characters')}
          {field('confirm', 'Confirm password', 'password', 'Repeat your password')}

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full py-2.5 mt-2" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="relative flex items-center my-4">
          <div className="flex-1 border-t border-white/10" />
          <span className="px-3 text-white/30 text-xs">or</span>
          <div className="flex-1 border-t border-white/10" />
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

        <p className="text-center text-white/40 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-violet-400 hover:text-violet-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

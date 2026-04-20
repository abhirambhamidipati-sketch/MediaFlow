import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { extractError } from '../utils/formatters'

const STATUS_CONFIG = {
  pending:  { icon: '⏳', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', label: 'Application Under Review' },
  approved: { icon: '✅', color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30',  label: 'Application Approved' },
  rejected: { icon: '❌', color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30',    label: 'Application Rejected' },
}

export default function ContributorApplyPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ organization_name: '', role: '', id_document: null })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Fetch existing application if any
  const { data: existingApp, isLoading } = useQuery({
    queryKey: ['my-application'],
    queryFn: async () => {
      const r = await api.get('/admin/applications/?page=1')
      return null // viewers can't access admin list; this will 403 gracefully
    },
    retry: false,
    enabled: false, // we don't have a user-facing application status endpoint
  })

  const applyMutation = useMutation({
    mutationFn: (fd) => api.post('/contributor/apply/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    onSuccess: () => {
      setSuccess(true)
      refreshUser()
    },
    onError: (err) => setError(extractError(err)),
  })

  if (!user) return <div className="text-center text-white/40 py-20">Please log in.</div>

  if (user.role === 'contributor' || user.role === 'admin') {
    return (
      <div className="glass p-12 text-center max-w-md mx-auto mt-10 animate-fade-in">
        <p className="text-4xl mb-4">🎉</p>
        <h2 className="text-xl font-bold text-white mb-2">
          {user.role === 'admin' ? 'You\'re an Admin' : 'You\'re a Contributor'}
        </h2>
        <p className="text-white/50 text-sm mb-6">
          {user.is_verified ? 'Your account is verified.' : 'Your application is being reviewed.'}
        </p>
        <button className="btn-primary" onClick={() => navigate('/')}>Go to Feed</button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="glass p-12 text-center max-w-md mx-auto mt-10 animate-fade-in">
        <p className="text-4xl mb-4">✅</p>
        <h2 className="text-xl font-bold text-white mb-2">Application Submitted!</h2>
        <p className="text-white/50 text-sm mb-6">
          Our team will review your application. You'll be notified once approved.
        </p>
        <button className="btn-primary" onClick={() => navigate('/')}>Back to Feed</button>
      </div>
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!form.id_document) { setError('Please upload an ID document'); return }
    const fd = new FormData()
    fd.append('organization_name', form.organization_name)
    fd.append('role', form.role)
    fd.append('id_document', form.id_document)
    applyMutation.mutate(fd)
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="glass p-6 md:p-8 animate-fade-in">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">📝</div>
          <h1 className="text-2xl font-bold text-white">Become a Contributor</h1>
          <p className="text-white/40 text-sm mt-2">
            Share your stories with the MediaFlow community. Complete the form below to apply.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-white/60 text-sm mb-1.5">Organization / Publication *</label>
            <input
              className="input-field"
              placeholder="e.g. Daily Tribune, Freelance"
              value={form.organization_name}
              onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-1.5">Your role *</label>
            <input
              className="input-field"
              placeholder="e.g. Journalist, Blogger, Reporter"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-1.5">ID Document *</label>
            <p className="text-white/30 text-xs mb-2">Upload a JPEG, PNG, or WEBP image of your press ID or official identification.</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="input-field file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0
                         file:text-xs file:font-medium file:bg-violet-500/20 file:text-violet-300
                         hover:file:bg-violet-500/30 cursor-pointer"
              onChange={(e) => setForm({ ...form, id_document: e.target.files[0] ?? null })}
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>
          )}

          <div className="glass p-4 text-sm text-white/40 space-y-1 mt-2">
            <p className="font-medium text-white/60">What happens next?</p>
            <p>1. Our team reviews your application (usually within 24–48 hours)</p>
            <p>2. Once approved, your role is upgraded to <span className="text-violet-300">Contributor</span></p>
            <p>3. You can publish articles visible to all MediaFlow readers</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-ghost flex-1" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={applyMutation.isPending}>
              {applyMutation.isPending ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

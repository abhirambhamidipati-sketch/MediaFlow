import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { Skeleton } from '../components/ui/Skeleton'
import { timeAgo, extractError } from '../utils/formatters'

const STATUS_BADGE = {
  pending:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/15 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
}

function ApplicationRow({ app, onAction }) {
  return (
    <div className="glass p-4 flex flex-col sm:flex-row sm:items-center gap-4 animate-fade-in">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium text-white">{app.username}</span>
          <span className={`badge-role border ${STATUS_BADGE[app.status] ?? ''}`}>{app.status}</span>
        </div>
        <p className="text-white/50 text-sm">{app.organization_name} · {app.role}</p>
        <p className="text-white/30 text-xs mt-1">{timeAgo(app.created_at)}</p>
      </div>

      {/* ID document preview */}
      {app.id_document && (
        <a href={`/media/${app.id_document}`} target="_blank" rel="noopener noreferrer"
           className="text-violet-400 text-xs hover:text-violet-300 transition-colors shrink-0">
          View ID
        </a>
      )}

      {app.status === 'pending' && (
        <div className="flex gap-2 shrink-0">
          <button
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 transition-all"
            onClick={() => onAction(app.id, 'approved')}
          >
            Approve
          </button>
          <button
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-all"
            onClick={() => onAction(app.id, 'rejected')}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState('all')
  const [actionError, setActionError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-applications'],
    queryFn: () => api.get('/admin/applications/').then((r) => r.data.results ?? r.data),
    enabled: user?.role === 'admin',
  })

  const { data: globalStats } = useQuery({
    queryKey: ['global-stats'],
    queryFn: () => api.get('/stats/').then((r) => r.data),
    enabled: user?.role === 'admin',
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/applications/${id}/`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-applications'] }),
    onError: (err) => setActionError(extractError(err)),
  })

  if (!user || user.role !== 'admin') {
    return (
      <div className="glass p-12 text-center text-white/40 max-w-md mx-auto mt-10">
        <p className="text-4xl mb-4">🔒</p>
        <p className="text-lg font-semibold text-white mb-2">Admin access required</p>
        <p className="text-sm mb-6">This area is restricted to administrators.</p>
        <button className="btn-ghost" onClick={() => navigate('/')}>Go Home</button>
      </div>
    )
  }

  const apps = data ?? []
  const filtered = filterStatus === 'all' ? apps : apps.filter((a) => a.status === filterStatus)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">🛡 Admin Panel</h1>
        <p className="text-white/40 text-sm mt-1">Manage contributor applications and platform stats</p>
      </div>

      {/* Global stats */}
      {globalStats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Articles', value: globalStats.total_news, icon: '📰' },
            { label: 'Total Users',    value: globalStats.total_users, icon: '👥' },
            { label: 'Total Comments', value: globalStats.total_comments, icon: '💬' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="glass p-4 text-center">
              <p className="text-2xl mb-1">{icon}</p>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-white/40 text-xs">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Applications */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-white">Contributor Applications</h2>
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {['all', 'pending', 'approved', 'rejected'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all
                  ${filterStatus === s ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {actionError && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">{actionError}</div>
        )}

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="glass p-10 text-center text-white/40">
            <p className="text-3xl mb-2">📋</p>
            <p>No {filterStatus !== 'all' ? filterStatus : ''} applications found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((app) => (
              <ApplicationRow
                key={app.id}
                app={app}
                onAction={(id, status) => reviewMutation.mutate({ id, status })}
              />
            ))}
          </div>
        )}
      </div>

      {/* News moderation */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent Articles</h2>
        <Link to="/" className="text-violet-400 text-sm hover:text-violet-300 transition-colors">
          Browse all articles in the feed →
        </Link>
      </div>
    </div>
  )
}

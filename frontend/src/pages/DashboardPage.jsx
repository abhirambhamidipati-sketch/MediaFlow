import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { NewsCard } from '../components/NewsCard'
import { Skeleton } from '../components/ui/Skeleton'
import { timeAgo } from '../utils/formatters'

const TABS = ['My Articles', 'Bookmarks', 'Stats']

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('My Articles')

  const { data: myNews, isLoading: loadingNews } = useQuery({
    queryKey: ['my-news', user?.id],
    queryFn: () => api.get(`/news/?author=${user.id}&source=internal`).then((r) => r.data.results ?? r.data),
    enabled: !!user,
  })

  const { data: bookmarks, isLoading: loadingBookmarks } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => api.get('/users/me/bookmarks/').then((r) => r.data.results ?? r.data),
    enabled: tab === 'Bookmarks' && !!user,
  })

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['stats', user?.id],
    queryFn: () => api.get('/users/me/stats/').then((r) => r.data),
    enabled: tab === 'Stats' && !!user,
  })

  if (!user) {
    return <div className="text-center text-white/40 py-20">Please log in to view your dashboard.</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass p-6 flex items-center gap-4 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-2xl font-bold">
          {user.username[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{user.username}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`badge-role ${user.role === 'admin' ? 'bg-red-500/20 text-red-300' : user.role === 'contributor' ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-500/20 text-slate-400'}`}>
              {user.role}
            </span>
            {user.is_verified && (
              <span className="text-green-400 text-xs">✓ Verified</span>
            )}
            {user.role === 'viewer' && (
              <Link to="/apply" className="text-violet-400 text-xs hover:text-violet-300 transition-colors">
                → Apply to contribute
              </Link>
            )}
          </div>
        </div>
        {(user.is_verified || user.role === 'admin') && (
          <Link to="/create" className="btn-primary ml-auto text-sm">+ Write Article</Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all
              ${tab === t ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'My Articles' && (
        loadingNews ? (
          <div className="space-y-4">{[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
        ) : !myNews?.length ? (
          <div className="glass p-10 text-center text-white/40">
            <p className="text-3xl mb-3">📝</p>
            <p>You haven't published any articles yet.</p>
            {user.is_verified && (
              <Link to="/create" className="mt-4 inline-block text-violet-400 hover:text-violet-300 text-sm">
                Write your first article →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {myNews.map((item) => (
              <NewsCard key={item.id} item={item} queryKey={['my-news', user.id]} />
            ))}
          </div>
        )
      )}

      {tab === 'Bookmarks' && (
        loadingBookmarks ? (
          <div className="space-y-4">{[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
        ) : !bookmarks?.length ? (
          <div className="glass p-10 text-center text-white/40">
            <p className="text-3xl mb-3">🔖</p>
            <p>No bookmarks yet.</p>
            <Link to="/" className="mt-3 inline-block text-violet-400 hover:text-violet-300 text-sm">Browse articles →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookmarks.map((item) => (
              <NewsCard key={item.id} item={item} queryKey={['bookmarks']} />
            ))}
          </div>
        )
      )}

      {tab === 'Stats' && (
        loadingStats ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Articles', value: stats.total_articles, icon: '📝' },
              { label: 'Total Views', value: stats.total_views, icon: '👁' },
              { label: 'Total Likes', value: stats.total_likes, icon: '♥' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="glass p-5 text-center">
                <p className="text-3xl mb-2">{icon}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-white/40 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        ) : null
      )}
    </div>
  )
}

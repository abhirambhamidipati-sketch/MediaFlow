import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { timeAgo } from '../utils/formatters'
import { Skeleton } from './ui/Skeleton'

export function CommentSection({ newsId, newCommentId }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [text, setText] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['comments', newsId],
    queryFn: () => api.get(`/news/${newsId}/comments/`).then((r) => r.data),
    enabled: !!newsId,
  })

  const addMutation = useMutation({
    mutationFn: (content) => api.post(`/news/${newsId}/comments/`, { content }),
    onSuccess: () => {
      setText('')
      qc.invalidateQueries({ queryKey: ['comments', newsId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/comments/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', newsId] }),
  })

  const comments = data?.results ?? data ?? []

  return (
    <section className="mt-8">
      <h3 className="text-white font-semibold mb-4">
        Comments {comments.length > 0 && <span className="text-white/40 font-normal text-sm">({comments.length})</span>}
      </h3>

      {/* Input */}
      {user && (
        <form
          className="flex gap-3 mb-6"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) addMutation.mutate(text.trim())
          }}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
            {user.username[0].toUpperCase()}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              className="input-field flex-1 text-sm"
              placeholder="Add a comment…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
            />
            <button
              type="submit"
              className="btn-primary px-4 shrink-0"
              disabled={!text.trim() || addMutation.isPending}
            >
              {addMutation.isPending ? '…' : 'Post'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-white/30 text-sm">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className={`glass px-4 py-3 flex gap-3 items-start ${c.id === newCommentId ? 'border-violet-500/50 animate-slide-in' : ''}`}
            >
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">
                {c.username?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white/80 text-sm font-medium">{c.username}</span>
                  <span className="text-white/30 text-xs">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-white/60 text-sm leading-relaxed">{c.content}</p>
              </div>
              {user?.username === c.username && (
                <button
                  className="text-white/20 hover:text-red-400 text-xs transition-colors"
                  onClick={() => deleteMutation.mutate(c.id)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

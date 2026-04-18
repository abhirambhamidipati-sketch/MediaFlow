import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { CommentSection } from '../components/CommentSection'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { categoryColor, timeAgo } from '../utils/formatters'
import { useWsContext } from '../layouts/MainLayout'

export default function NewsDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()
  const { lastEvent } = useWsContext()

  const [liked, setLiked] = useState(null)
  const [likesCount, setLikesCount] = useState(null)
  const [bookmarked, setBookmarked] = useState(null)

  const { data: article, isLoading, isError } = useQuery({
    queryKey: ['news', Number(id)],
    queryFn: () => api.get(`/news/${id}/`).then((r) => r.data),
  })

  // Seed local state once article loads
  useEffect(() => {
    if (article) {
      if (liked === null)      setLiked(article.is_liked)
      if (likesCount === null) setLikesCount(article.likes_count)
      if (bookmarked === null) setBookmarked(article.is_bookmarked)
    }
  }, [article])  // intentionally omitting derived state to avoid loops

  // Real-time: invalidate comments for this article when a new comment arrives
  useEffect(() => {
    if (lastEvent?.type === 'new_comment' && lastEvent.news_id === Number(id)) {
      qc.invalidateQueries({ queryKey: ['comments', Number(id)] })
    }
  }, [lastEvent, id, qc])

  const likeMutation = useMutation({
    mutationFn: () => api.post(`/news/${id}/like/`),
    onMutate: () => {
      const wasLiked = liked
      setLiked(!wasLiked)
      setLikesCount((c) => (wasLiked ? c - 1 : c + 1))
    },
    onSuccess: (res) => {
      setLiked(res.data.liked)
      setLikesCount(res.data.likes_count)
    },
    onError: () => {
      setLiked(article?.is_liked ?? false)
      setLikesCount(article?.likes_count ?? 0)
    },
  })

  const bookmarkMutation = useMutation({
    mutationFn: () => api.post(`/news/${id}/bookmark/`),
    onMutate: () => setBookmarked((b) => !b),
    onSuccess: (res) => setBookmarked(res.data.bookmarked),
    onError: () => setBookmarked(article?.is_bookmarked ?? false),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/news/${id}/`),
    onSuccess: () => navigate('/'),
  })

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    )
  }

  if (isError || !article) {
    return (
      <div className="glass p-12 text-center text-white/40 max-w-3xl mx-auto">
        <p className="text-4xl mb-3">😕</p>
        <p>Article not found.</p>
        <button className="mt-4 text-violet-400 hover:text-violet-300 text-sm" onClick={() => navigate('/')}>
          Back to feed
        </button>
      </div>
    )
  }

  const a = article
  const isOwner = user?.id === a.author
  const isLiked = liked ?? a.is_liked
  const isBookmarked = bookmarked ?? a.is_bookmarked
  const displayLikes = likesCount ?? a.likes_count

  return (
    <div className="max-w-3xl mx-auto">
      <article className="glass p-6 md:p-8 animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-white/40 hover:text-white text-sm mb-6 transition-colors"
        >
          ← Back
        </button>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          <Badge className={`border ${categoryColor(a.category)}`}>{a.category}</Badge>
          <span className="text-white/40 text-xs">{timeAgo(a.created_at)}</span>
          {a.author_username && (
            <span className="text-white/40 text-xs ml-1">by {a.author_username}</span>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-4">{a.title}</h1>

        {a.image && (
          <img
            src={`/media/${a.image}`}
            alt={a.title}
            className="w-full max-h-80 object-cover rounded-xl mb-6"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        )}

        <p className="text-white/70 leading-relaxed text-base">{a.description}</p>

        {user && (
          <div className="flex items-center gap-2 mt-8 pt-6 border-t border-white/10 flex-wrap">
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${isLiked ? 'bg-red-500/15 text-red-400' : 'bg-white/5 text-white/50 hover:bg-red-500/10 hover:text-red-400'}`}
              onClick={() => likeMutation.mutate()}
              disabled={likeMutation.isPending}
            >
              {isLiked ? '♥' : '♡'} {displayLikes} Likes
            </button>

            <span className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/30 bg-white/5">
              💬 {a.comments_count} Comments
            </span>

            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${isBookmarked ? 'bg-violet-500/15 text-violet-400' : 'bg-white/5 text-white/50 hover:bg-violet-500/10 hover:text-violet-400'}`}
              onClick={() => bookmarkMutation.mutate()}
              disabled={bookmarkMutation.isPending}
            >
              {isBookmarked ? '🔖 Saved' : '📎 Save'}
            </button>

            <span className="text-white/30 text-sm ml-auto">👁 {a.views_count} views</span>

            {isOwner && (
              <button
                className="px-3 py-2 rounded-xl text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                onClick={() => { if (window.confirm('Delete this article?')) deleteMutation.mutate() }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </article>

      <div className="glass p-6 md:p-8 mt-4 animate-fade-in">
        <CommentSection newsId={Number(id)} />
      </div>
    </div>
  )
}

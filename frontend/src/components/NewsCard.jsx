import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { Badge } from './ui/Badge'
import { categoryColor, timeAgo } from '../utils/formatters'

export function NewsCard({ item, queryKey }) {
  const { user } = useAuth()
  const qc = useQueryClient()

  const [liked, setLiked] = useState(item.is_liked ?? false)
  const [likesCount, setLikesCount] = useState(item.likes_count ?? 0)
  const [bookmarked, setBookmarked] = useState(item.is_bookmarked ?? false)

  const likeMutation = useMutation({
    mutationFn: () => api.post(`/news/${item.id}/like/`),
    onMutate: () => {
      // Optimistic update
      const wasLiked = liked
      setLiked(!wasLiked)
      setLikesCount((c) => wasLiked ? c - 1 : c + 1)
    },
    onSuccess: (res) => {
      setLiked(res.data.liked)
      setLikesCount(res.data.likes_count)
    },
    onError: () => {
      // Revert on error
      setLiked(liked)
      setLikesCount(item.likes_count)
    },
  })

  const bookmarkMutation = useMutation({
    mutationFn: () => api.post(`/news/${item.id}/bookmark/`),
    onMutate: () => setBookmarked((b) => !b),
    onSuccess: (res) => setBookmarked(res.data.bookmarked),
    onError: () => setBookmarked(item.is_bookmarked),
  })

  const isExternal = item.is_external === true

  const cardContent = (
    <div className="glass p-5 flex flex-col gap-3 group hover:bg-white/8 transition-all duration-200 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        {item.category && (
          <Badge className={`border ${categoryColor(item.category)}`}>{item.category}</Badge>
        )}
        {isExternal && (
          <Badge className="border border-amber-500/30 bg-amber-500/10 text-amber-300">External</Badge>
        )}
        <span className="text-white/40 text-xs ml-auto">
          {item.created_at ? timeAgo(item.created_at) : item.source ?? ''}
        </span>
      </div>

      {/* Title */}
      <h2 className="text-white font-semibold text-base leading-snug group-hover:text-violet-300 transition-colors line-clamp-2">
        {item.title}
      </h2>

      {/* Description */}
      {item.description && (
        <p className="text-white/50 text-sm leading-relaxed line-clamp-2">{item.description}</p>
      )}

      {/* Image */}
      {(item.image || item.image_url) && (
        <img
          src={isExternal ? item.image : `/media/${item.image}`}
          alt={item.title}
          className="w-full h-44 object-cover rounded-xl opacity-80"
          onError={(e) => { e.target.style.display = 'none' }}
        />
      )}

      {/* Footer */}
      <div className="flex items-center gap-1 pt-1 border-t border-white/5">
        {item.author_username && (
          <span className="text-xs text-white/40 mr-auto">by {item.author_username}</span>
        )}
        {item.source && !item.author_username && (
          <span className="text-xs text-white/40 mr-auto">{item.source}</span>
        )}

        {!isExternal && user && (
          <>
            {/* Like */}
            <button
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${liked ? 'text-red-400 bg-red-500/10' : 'text-white/40 hover:text-red-400 hover:bg-red-500/10'}`}
              onClick={(e) => { e.preventDefault(); likeMutation.mutate() }}
              disabled={likeMutation.isPending}
            >
              {liked ? '♥' : '♡'} {likesCount}
            </button>

            {/* Comment */}
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-white/40">
              💬 {item.comments_count ?? 0}
            </span>

            {/* Bookmark */}
            <button
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all
                          ${bookmarked ? 'text-violet-400 bg-violet-500/10' : 'text-white/40 hover:text-violet-400 hover:bg-violet-500/10'}`}
              onClick={(e) => { e.preventDefault(); bookmarkMutation.mutate() }}
              disabled={bookmarkMutation.isPending}
            >
              {bookmarked ? '🔖' : '📎'}
            </button>

            {/* Views */}
            <span className="flex items-center gap-1 px-2 text-xs text-white/30">
              👁 {item.views_count ?? 0}
            </span>
          </>
        )}
      </div>
    </div>
  )

  if (isExternal) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
        {cardContent}
      </a>
    )
  }

  return <Link to={`/news/${item.id}`}>{cardContent}</Link>
}

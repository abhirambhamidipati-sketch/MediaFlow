import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { Badge } from './ui/Badge'
import { categoryColor, timeAgo } from '../utils/formatters'

/* ── Action icons ─────────────────────────────────────────────────── */
function IconHeart({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

function IconComment() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function IconBookmark({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function IconEye() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function IconArrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}

/* ── NewsCard ─────────────────────────────────────────────────────── */
export function NewsCard({ item, queryKey }) {
  const { user } = useAuth()
  const qc = useQueryClient()

  const [liked,      setLiked]      = useState(item.is_liked ?? false)
  const [likesCount, setLikesCount] = useState(item.likes_count ?? 0)
  const [bookmarked, setBookmarked] = useState(item.is_bookmarked ?? false)

  const likeMutation = useMutation({
    mutationFn: () => api.post(`/news/${item.id}/like/`),
    onMutate:  () => { const was = liked; setLiked(!was); setLikesCount((c) => was ? c - 1 : c + 1) },
    onSuccess: (res) => { setLiked(res.data.liked); setLikesCount(res.data.likes_count) },
    onError:   ()    => { setLiked(liked); setLikesCount(item.likes_count) },
  })

  const bookmarkMutation = useMutation({
    mutationFn: () => api.post(`/news/${item.id}/bookmark/`),
    onMutate:  () => setBookmarked((b) => !b),
    onSuccess: (res) => setBookmarked(res.data.bookmarked),
    onError:   ()    => setBookmarked(item.is_bookmarked),
  })

  const isExternal = item.is_external === true
  const hasImage   = Boolean(item.image || item.image_url)
  const imgSrc     = isExternal ? (item.image_url ?? item.image) : (item.image ? `/media/${item.image}` : null)

  const inner = (
    <article className="card group cursor-pointer overflow-hidden">
      {/* Cover image with overlay on hover */}
      {hasImage && imgSrc && (
        <div className="w-full aspect-[16/7] overflow-hidden bg-white/[0.025] relative">
          <img
            src={imgSrc}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            onError={(e) => { e.target.parentElement.style.display = 'none' }}
          />
          {/* Subtle overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      )}

      <div className="p-5">
        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {item.category && (
            <Badge className={`border text-[11px] ${categoryColor(item.category)}`}>
              {item.category}
            </Badge>
          )}
          {isExternal && item.source && (
            <Badge className="border border-amber-500/25 bg-amber-500/8 text-amber-400/80 text-[11px] uppercase tracking-wide">
              {item.source}
            </Badge>
          )}
          {!isExternal && (
            <Badge className="border border-blue-500/20 bg-blue-500/8 text-blue-400/70 text-[11px]">
              MediaFlow
            </Badge>
          )}
          <span className="text-white/25 text-xs ml-auto shrink-0">
            {item.created_at ? timeAgo(item.created_at) : ''}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-white/88 font-semibold text-[15px] leading-[1.45] mb-2 line-clamp-2
                       group-hover:text-blue-300 transition-colors duration-200">
          {item.title}
        </h2>

        {/* Description */}
        {item.description && (
          <p className="text-white/38 text-sm leading-relaxed line-clamp-2 mb-4">
            {item.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-1 pt-3 border-t border-white/[0.04]">
          {item.author_username && !isExternal && (
            <span className="text-xs text-white/28 mr-auto">{item.author_username}</span>
          )}

          {isExternal && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400/65 font-medium mr-auto hover:text-amber-400 transition-colors">
              Read article <IconArrow />
            </span>
          )}

          {!isExternal && user && (
            <div className="flex items-center gap-0.5 ml-auto">
              <button
                className={[
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                  liked
                    ? 'text-rose-400 bg-rose-500/10'
                    : 'text-white/30 hover:text-rose-400 hover:bg-rose-500/8',
                ].join(' ')}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); likeMutation.mutate() }}
                disabled={likeMutation.isPending}
              >
                <IconHeart filled={liked} />
                <span>{likesCount}</span>
              </button>

              <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-white/25">
                <IconComment />
                <span>{item.comments_count ?? 0}</span>
              </span>

              <button
                className={[
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150',
                  bookmarked
                    ? 'text-blue-400 bg-blue-500/10'
                    : 'text-white/28 hover:text-blue-400 hover:bg-blue-500/8',
                ].join(' ')}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); bookmarkMutation.mutate() }}
                disabled={bookmarkMutation.isPending}
              >
                <IconBookmark filled={bookmarked} />
              </button>

              <span className="flex items-center gap-1 px-2 text-xs text-white/22">
                <IconEye />
                <span>{item.views_count ?? 0}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  )

  if (isExternal) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="block feed-item">
        {inner}
      </a>
    )
  }

  return <Link to={`/news/${item.id}`} className="block feed-item">{inner}</Link>
}

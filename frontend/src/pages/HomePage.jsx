import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import api from '../api/axios'
import { NewsCard } from '../components/NewsCard'
import { TrendingSidebar } from '../components/TrendingSidebar'
import { LiveBanner } from '../components/LiveBanner'
import { NewsCardSkeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { useWsContext } from '../layouts/MainLayout'
import { categoryColor, timeAgo } from '../utils/formatters'

/* ── Icons ──────────────────────────────────────────────────────── */
function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
function IconArrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}

/* ── Featured card ──────────────────────────────────────────────── */
function FeaturedCard({ item }) {
  const isExternal = item.is_external === true
  const imgSrc = isExternal ? (item.image_url ?? item.image) : (item.image ? `/media/${item.image}` : null)

  const inner = (
    <article className="group relative overflow-hidden rounded-2xl bg-[#111118] border border-white/[0.06]
                        hover:border-blue-500/20 transition-all duration-300 cursor-pointer animate-fade-in">
      {/* Large image */}
      {imgSrc && (
        <div className="w-full aspect-[21/9] overflow-hidden bg-white/[0.02]">
          <img
            src={imgSrc}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            onError={(e) => { e.target.parentElement.style.display = 'none' }}
          />
        </div>
      )}
      <div className="p-6 sm:p-8">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-widest bg-blue-500/15 text-blue-400 border border-blue-500/25">
            Featured
          </span>
          {item.category && (
            <Badge className={`border text-[11px] ${categoryColor(item.category)}`}>{item.category}</Badge>
          )}
          {isExternal && item.source && (
            <Badge className="border border-amber-500/25 bg-amber-500/8 text-amber-400/80 text-[11px] uppercase tracking-wide">
              {item.source}
            </Badge>
          )}
          <span className="text-white/30 text-xs ml-auto">{item.created_at ? timeAgo(item.created_at) : ''}</span>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-white/90 leading-[1.3] group-hover:text-blue-300
                       transition-colors duration-200 mb-3 line-clamp-2">
          {item.title}
        </h2>

        {/* Description */}
        {item.description && (
          <p className="text-white/45 text-sm leading-relaxed line-clamp-2 mb-5">{item.description}</p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-white/35">
          {item.author_username && !isExternal && <span>{item.author_username}</span>}
          {!isExternal && (
            <>
              <span>♥ {item.likes_count ?? 0}</span>
              <span>💬 {item.comments_count ?? 0}</span>
              <span>👁 {item.views_count ?? 0}</span>
            </>
          )}
          {isExternal && (
            <span className="flex items-center gap-1.5 text-amber-400/70 font-medium ml-auto">
              Read full article <IconArrow />
            </span>
          )}
        </div>
      </div>
    </article>
  )

  if (isExternal) return <a href={item.url} target="_blank" rel="noopener noreferrer">{inner}</a>
  return <Link to={`/news/${item.id}`}>{inner}</Link>
}

/* ── Constants ──────────────────────────────────────────────────── */
const CATEGORIES = ['All', 'Technology', 'Sports', 'Politics', 'Entertainment', 'General']
const SOURCES    = [
  { value: 'all',      label: 'All' },
  { value: 'internal', label: 'MediaFlow' },
  { value: 'external', label: 'External' },
]

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/* ── HomePage ───────────────────────────────────────────────────── */
export default function HomePage() {
  const { lastEvent } = useWsContext()
  const [category, setCategory] = useState('All')
  const [source,   setSource]   = useState('all')
  const [search,   setSearch]   = useState('')
  const debouncedSearch         = useDebounce(search)
  const [liveBanner, setLiveBanner] = useState(null)
  const loaderRef = useRef(null)

  useEffect(() => {
    if (lastEvent?.type === 'new_news') {
      setLiveBanner(`"${lastEvent.title}" was just published`)
    }
  }, [lastEvent])

  const buildParams = useCallback((pageParam) => {
    const params = new URLSearchParams()
    if (category !== 'All') params.set('category', category)
    if (source !== 'all') params.set('source', source)
    if (debouncedSearch) params.set('search', debouncedSearch)
    params.set('page', pageParam)
    return params.toString()
  }, [category, source, debouncedSearch])

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteQuery({
      queryKey: ['news', category, source, debouncedSearch],
      queryFn: ({ pageParam = 1 }) =>
        api.get(`/news/?${buildParams(pageParam)}`).then((r) => r.data),
      getNextPageParam: (lastPage) => {
        if (!lastPage.next) return undefined
        const url = new URL(lastPage.next, 'http://x')
        return url.searchParams.get('page')
      },
      staleTime: 30_000,
    })

  // Infinite scroll sentinel
  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage() },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const allItems   = data?.pages.flatMap((p) => p.results ?? []) ?? []
  const isFiltered = category !== 'All' || source !== 'all' || Boolean(debouncedSearch)
  const showFeatured = !isFiltered && allItems.length > 0

  return (
    <div className="flex gap-6 items-start">
      {/* ── Main feed column ──────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* Search bar */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
            <IconSearch />
          </span>
          <input
            className="input-field pl-10 pr-10"
            placeholder="Search articles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              <IconX />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Category pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`filter-pill ${category === c ? 'active' : ''}`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Source segmented control */}
          <div className="flex items-center bg-white/[0.04] border border-white/[0.06] rounded-xl p-0.5 ml-auto shrink-0">
            {SOURCES.map((s) => (
              <button
                key={s.value}
                onClick={() => setSource(s.value)}
                className={[
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                  source === s.value
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/35 hover:text-white/70',
                ].join(' ')}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live banner */}
        {liveBanner && (
          <LiveBanner message={liveBanner} onDismiss={() => setLiveBanner(null)} />
        )}

        {/* Feed */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <NewsCardSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-10 text-center animate-fade-in">
            <p className="text-3xl mb-3">⚠</p>
            <p className="text-white/45 text-sm">Failed to load news. Check your connection.</p>
          </div>
        ) : allItems.length === 0 ? (
          <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-14 text-center animate-fade-in">
            <p className="text-white/20 text-4xl mb-3">◯</p>
            <p className="text-white/45 text-sm mb-4">No articles found.</p>
            {isFiltered && (
              <button
                className="text-blue-400 text-sm hover:text-blue-300 transition-colors"
                onClick={() => { setCategory('All'); setSearch(''); setSource('all') }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {showFeatured && <FeaturedCard item={allItems[0]} />}
            {allItems.slice(showFeatured ? 1 : 0).map((item, i) => (
              <NewsCard
                key={item.id ?? `ext-${i}`}
                item={item}
                queryKey={['news', category, source, debouncedSearch]}
              />
            ))}
            {/* Infinite scroll sentinel */}
            <div ref={loaderRef} className="h-10 flex items-center justify-center">
              {isFetchingNextPage && (
                <div className="w-5 h-5 border-2 border-white/10 border-t-blue-500/60 rounded-full animate-spin" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel ──────────────────────────────────── */}
      <div className="hidden xl:block w-[280px] shrink-0">
        <TrendingSidebar />
      </div>
    </div>
  )
}

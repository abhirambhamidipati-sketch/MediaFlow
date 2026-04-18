import { useCallback, useEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { NewsCard } from '../components/NewsCard'
import { TrendingSidebar } from '../components/TrendingSidebar'
import { LiveBanner } from '../components/LiveBanner'
import { NewsCardSkeleton } from '../components/ui/Skeleton'
import { useWsContext } from '../layouts/MainLayout'

const CATEGORIES = ['All', 'Technology', 'Sports', 'Politics', 'Entertainment', 'General']
const SOURCES = [
  { value: 'all', label: 'All Sources' },
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

export default function HomePage() {
  const qc = useQueryClient()
  const { lastEvent } = useWsContext()
  const [category, setCategory] = useState('All')
  const [source, setSource] = useState('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [liveBanner, setLiveBanner] = useState(null)
  const loaderRef = useRef(null)

  // Surface live banner on new_news WS event
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

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError,
  } = useInfiniteQuery({
    queryKey: ['news', category, source, debouncedSearch],
    queryFn: ({ pageParam = 1 }) => api.get(`/news/?${buildParams(pageParam)}`).then((r) => r.data),
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

  const allItems = data?.pages.flatMap((p) => p.results ?? []) ?? []

  return (
    <div className="flex gap-6">
      {/* Main feed */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
          <input
            className="input-field pl-9"
            placeholder="Search news…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150
                ${category === c
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Source toggle */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
          {SOURCES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSource(s.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all
                ${source === s.value ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'}`}
            >
              {s.label}
            </button>
          ))}
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
          <div className="glass p-8 text-center text-white/40">
            <p className="text-4xl mb-3">⚠️</p>
            <p>Failed to load news. Check your connection.</p>
          </div>
        ) : allItems.length === 0 ? (
          <div className="glass p-12 text-center text-white/40">
            <p className="text-4xl mb-3">🔍</p>
            <p>No articles found.</p>
            {(category !== 'All' || debouncedSearch) && (
              <button className="mt-3 text-violet-400 text-sm hover:text-violet-300" onClick={() => { setCategory('All'); setSearch('') }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {allItems.map((item, i) => (
              <NewsCard key={item.id ?? `ext-${i}`} item={item} queryKey={['news', category, source, debouncedSearch]} />
            ))}
            {/* Infinite scroll sentinel */}
            <div ref={loaderRef} className="h-8 flex items-center justify-center">
              {isFetchingNextPage && (
                <div className="w-5 h-5 border-2 border-violet-500/50 border-t-violet-500 rounded-full animate-spin" />
              )}
            </div>
          </>
        )}
      </div>

      {/* Trending sidebar */}
      <div className="hidden lg:block w-72 shrink-0">
        <TrendingSidebar />
      </div>
    </div>
  )
}

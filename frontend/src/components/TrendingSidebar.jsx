import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'
import { categoryColor } from '../utils/formatters'

function IconFire() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c0 0-5 5-5 11a5 5 0 0 0 10 0c0-4-3-7-3-7s-1 3-2 4c-1-2-0-8 0-8z"/>
    </svg>
  )
}

function IconEye() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function IconHeart() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

function TrendingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-3 items-start p-2">
          <div className="skeleton w-5 h-4 rounded shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3.5 w-full rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TrendingSidebar() {
  const { data, isLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: () => api.get('/news/trending/').then((r) => r.data.results ?? r.data),
    staleTime: 120_000,
  })

  const items = (data ?? []).slice(0, 8)

  return (
    <aside className="w-full space-y-4">
      {/* Trending section */}
      <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4 sticky top-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <span className="text-orange-400"><IconFire /></span>
            Trending
          </h3>
          <Link
            to="/trending"
            className="text-[11px] text-blue-400/70 hover:text-blue-400 transition-colors"
          >
            See all →
          </Link>
        </div>

        {isLoading ? (
          <TrendingSkeleton />
        ) : items.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">Nothing trending yet.</p>
        ) : (
          <ol className="space-y-1">
            {items.map((item, idx) => (
              <li key={item.id}>
                <Link
                  to={`/news/${item.id}`}
                  className="flex gap-3 items-start px-2 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group"
                >
                  {/* Rank */}
                  <span
                    className={[
                      'font-mono text-xs w-4 shrink-0 mt-0.5 font-bold',
                      idx === 0 ? 'text-amber-400' :
                      idx === 1 ? 'text-white/50' :
                      idx === 2 ? 'text-amber-700/80' :
                      'text-white/20',
                    ].join(' ')}
                  >
                    {idx + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-white/70 text-[13px] leading-snug line-clamp-2 group-hover:text-blue-300 transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-white/25 text-[11px]">
                        <IconEye /> {item.views_count ?? 0}
                      </span>
                      <span className="flex items-center gap-1 text-white/25 text-[11px]">
                        <IconHeart /> {item.likes_count ?? 0}
                      </span>
                      {item.category && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${categoryColor(item.category)}`}>
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Categories quick-nav */}
      <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-white/80 mb-3">Topics</h3>
        <div className="flex flex-wrap gap-2">
          {['Technology', 'Sports', 'Politics', 'Entertainment', 'General'].map((cat) => (
            <Link
              key={cat}
              to={`/?category=${cat}`}
              className={`text-[12px] px-3 py-1.5 rounded-lg border transition-colors hover:opacity-90 ${categoryColor(cat)}`}
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  )
}

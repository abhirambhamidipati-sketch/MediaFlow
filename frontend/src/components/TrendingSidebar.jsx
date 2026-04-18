import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'
import { Skeleton } from './ui/Skeleton'
import { categoryColor, timeAgo } from '../utils/formatters'

export function TrendingSidebar() {
  const { data, isLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: () => api.get('/news/trending/').then((r) => r.data.results ?? r.data),
    staleTime: 120_000,
  })

  return (
    <aside className="w-full">
      <div className="glass p-4 sticky top-20">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <span className="text-orange-400">🔥</span> Trending
        </h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : (
          <ol className="space-y-2">
            {(data ?? []).slice(0, 8).map((item, idx) => (
              <li key={item.id}>
                <Link
                  to={`/news/${item.id}`}
                  className="flex gap-3 items-start py-2 px-2 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <span className="text-white/20 font-mono text-sm w-4 shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-white/80 text-sm leading-snug line-clamp-2 group-hover:text-violet-300 transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-white/30 text-xs">👁 {item.views_count}</span>
                      <span className="text-white/30 text-xs">♥ {item.likes_count}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-4 pt-4 border-t border-white/10">
          <Link to="/trending" className="text-violet-400 text-sm hover:text-violet-300 transition-colors">
            See all trending →
          </Link>
        </div>
      </div>
    </aside>
  )
}

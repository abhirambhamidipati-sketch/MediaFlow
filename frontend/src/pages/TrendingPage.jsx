import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { categoryColor, timeAgo } from '../utils/formatters'

export default function TrendingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: () => api.get('/news/trending/').then((r) => r.data.results ?? r.data),
    staleTime: 120_000,
  })

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>🔥</span> Trending Now
        </h1>
        <p className="text-white/40 text-sm mt-1">Top articles ranked by views and engagement</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : !data?.length ? (
        <div className="glass p-12 text-center text-white/40">
          <p className="text-4xl mb-3">📊</p>
          <p>No trending articles yet.</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {data.map((item, idx) => (
            <li key={item.id}>
              <Link to={`/news/${item.id}`} className="glass p-5 flex gap-5 items-start hover:bg-white/8 transition-all group animate-fade-in block">
                {/* Rank */}
                <span className={`text-4xl font-black shrink-0 leading-none ${idx < 3 ? 'text-violet-400' : 'text-white/20'}`}>
                  {idx + 1}
                </span>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge className={`border ${categoryColor(item.category)}`}>{item.category}</Badge>
                    <span className="text-white/30 text-xs">{timeAgo(item.created_at)}</span>
                  </div>
                  <h2 className="text-white font-semibold leading-snug line-clamp-2 group-hover:text-violet-300 transition-colors">
                    {item.title}
                  </h2>
                  <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
                    <span>👁 {item.views_count} views</span>
                    <span>♥ {item.likes_count} likes</span>
                    <span>💬 {item.comments_count} comments</span>
                  </div>
                </div>
                {/* Thumbnail */}
                {item.image && (
                  <img
                    src={`/media/${item.image}`}
                    alt=""
                    className="w-20 h-16 object-cover rounded-xl opacity-70 shrink-0"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function categoryColor(cat) {
  const map = {
    Technology: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    Sports: 'bg-green-500/20 text-green-300 border-green-500/30',
    Politics: 'bg-red-500/20 text-red-300 border-red-500/30',
    Entertainment: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    General: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  }
  return map[cat] ?? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
}

export function roleColor(role) {
  if (role === 'admin') return 'bg-red-500/20 text-red-300'
  if (role === 'contributor') return 'bg-violet-500/20 text-violet-300'
  return 'bg-slate-500/20 text-slate-400'
}

export function extractError(err) {
  const data = err?.response?.data
  const status = err?.response?.status

  if (!data) return err?.message ?? 'Something went wrong'

  // Django returns HTML pages for 404/500 when DEBUG=False — never show raw HTML
  if (typeof data === 'string') {
    if (data.trimStart().startsWith('<')) {
      if (status === 404) return 'Resource not found (404).'
      if (status >= 500) return 'Server error. Please try again later.'
      return 'Unexpected server response.'
    }
    return data
  }

  if (typeof data === 'object') {
    // DRF error: { "detail": "..." }
    if (data.detail) return String(data.detail)
    // DRF field errors: { "field": ["msg"] } or { "field": "msg" }
    const vals = Object.values(data)
    if (vals.length) {
      const first = vals[0]
      return Array.isArray(first) ? String(first[0]) : String(first)
    }
  }

  return 'Something went wrong'
}

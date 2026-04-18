export function LiveBanner({ message, onDismiss }) {
  if (!message) return null
  return (
    <div className="bg-violet-600/20 border border-violet-500/30 rounded-xl px-4 py-3 flex items-center justify-between animate-slide-in">
      <div className="flex items-center gap-2 text-sm text-violet-300">
        <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
        <span>🔴 Live: {message}</span>
      </div>
      <button onClick={onDismiss} className="text-violet-400/60 hover:text-violet-300 text-xs transition-colors">
        Dismiss
      </button>
    </div>
  )
}

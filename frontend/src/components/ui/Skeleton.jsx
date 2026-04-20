export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-xl ${className}`} />
}

export function NewsCardSkeleton() {
  return (
    <div className="bg-[#111118] border border-white/[0.06] rounded-2xl overflow-hidden animate-fade-in">
      {/* Image placeholder */}
      <div className="skeleton w-full aspect-[16/7]" style={{ borderRadius: 0 }} />
      <div className="p-5 space-y-3">
        {/* Badges row */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-[22px] w-20" />
          <Skeleton className="h-[22px] w-16" />
          <Skeleton className="h-[22px] w-12 ml-auto" />
        </div>
        {/* Title */}
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-5 w-3/5" />
        {/* Description */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        {/* Footer */}
        <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04]">
          <Skeleton className="h-4 w-16" />
          <div className="flex gap-2 ml-auto">
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-7 w-10" />
            <Skeleton className="h-7 w-8" />
          </div>
        </div>
      </div>
    </div>
  )
}

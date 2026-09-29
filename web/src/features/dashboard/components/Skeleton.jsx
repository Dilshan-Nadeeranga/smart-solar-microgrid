import { cardClass } from './styles'

export function SkeletonBlock({ className = '' }) {
  return <span className={`block animate-pulse rounded-md bg-(--dash-skeleton) motion-reduce:animate-none ${className}`} />
}

/** Placeholder with the same footprint as a stat card: lg attention, md snapshot, sm infrastructure. */
export function StatCardSkeleton({ size = 'lg', label = 'Loading' }) {
  const lg = size === 'lg'
  const sm = size === 'sm'

  return (
    <div className={`${cardClass} flex ${sm ? 'items-center gap-3 p-4' : 'flex-col gap-3 p-5'}`} role="status" aria-label={label}>
      {size !== 'md' && <SkeletonBlock className={sm ? 'h-9 w-9 shrink-0 rounded-[10px]' : 'h-10 w-10 rounded-[10px]'} />}
      <div className="flex flex-1 flex-col gap-2">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className={lg ? 'h-10 w-16' : sm ? 'h-5 w-14' : 'h-8 w-14'} />
        {lg && <SkeletonBlock className="h-4 w-20" />}
      </div>
    </div>
  )
}

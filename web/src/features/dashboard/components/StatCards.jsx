import { Link } from 'react-router-dom'
import { ArrowRightIcon, TrendDownIcon, TrendUpIcon } from '../icons'
import SectionError from './SectionError'
import { StatCardSkeleton } from './Skeleton'
import { cardClass, focusRing, formatCount, smallCapsClass, tones } from './styles'

function IconBadge({ icon: Icon, tone, size = 'lg' }) {
  const box = size === 'lg' ? 'h-10 w-10' : 'h-9 w-9'
  return (
    <span className={`flex ${box} shrink-0 items-center justify-center rounded-[10px] ${tones[tone].badge}`}>
      <Icon className="h-5 w-5" strokeWidth={size === 'lg' ? 2 : 1.8} />
    </span>
  )
}

/**
 * "Needs your attention" card. The whole card is a link to the filtered list;
 * while loading or failed it is a plain block, so the Retry button is not nested in a link.
 * `unavailable` renders a card whose data source is not connected yet (no count).
 */
export function AttentionCard({ to, label, value, icon, tone, linkLabel, query, unavailable = false, note }) {
  if (query?.isLoading) return <StatCardSkeleton size="lg" label={`Loading ${label}`} />

  if (query?.isError) {
    return (
      <div className={`${cardClass} flex flex-col gap-3 p-5`}>
        <IconBadge icon={icon} tone={tone} />
        <span className={smallCapsClass}>{label}</span>
        <SectionError error={query.error} onRetry={query.refetch} retrying={query.isFetching} />
      </div>
    )
  }

  return (
    <Link
      to={to}
      className={`${cardClass} group flex flex-col gap-3 p-5 transition-colors hover:border-(--dash-text-3) ${focusRing}`}
    >
      <IconBadge icon={icon} tone={tone} />
      <span className={smallCapsClass}>{label}</span>
      {unavailable ? (
        <span className="flex flex-col">
          <span className="text-[38px] font-extrabold leading-none text-(--dash-text-3)" aria-hidden="true">
            —
          </span>
          <span className="mt-2 text-xs text-(--dash-text-2)">{note}</span>
        </span>
      ) : (
        <span className="text-[38px] font-extrabold leading-none tracking-tight">{formatCount(value)}</span>
      )}
      <span className={`mt-auto inline-flex items-center gap-1.5 text-sm font-semibold ${tones[tone].text}`}>
        {linkLabel}
        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </span>
    </Link>
  )
}

function TrendChip({ percent }) {
  const up = percent > 0
  const Icon = up ? TrendUpIcon : TrendDownIcon
  const text = `${up ? '+' : percent < 0 ? '−' : ''}${Math.abs(percent)}%`

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${up ? 'bg-(--dash-green-bg) text-(--dash-green)' : 'bg-(--dash-neutral-bg) text-(--dash-text-2)'}`}
      title="Compared with yesterday"
    >
      {percent !== 0 && <Icon className="h-3.5 w-3.5" strokeWidth={2} />}
      {text}
      <span className="sr-only"> compared with yesterday</span>
    </span>
  )
}

/** "Operations snapshot" card: label and a 28px number, optional trend chip. */
export function SnapshotCard({ label, value, query, trendPercent = null }) {
  if (query.isLoading) return <StatCardSkeleton size="md" label={`Loading ${label}`} />

  return (
    <div className={`${cardClass} flex flex-col gap-2 p-5`}>
      <span className={smallCapsClass}>{label}</span>
      {query.isError ? (
        <SectionError error={query.error} onRetry={query.refetch} retrying={query.isFetching} />
      ) : (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[28px] font-extrabold leading-tight tracking-tight">{formatCount(value)}</span>
          {typeof trendPercent === 'number' && <TrendChip percent={trendPercent} />}
        </div>
      )}
    </div>
  )
}

/** "Infrastructure" card: quieter, neutral 36px badge and a 21px number. */
export function InfraCard({ label, value, icon }) {
  return (
    <div className={`${cardClass} flex items-center gap-3 p-4`}>
      <IconBadge icon={icon} tone="neutral" size="sm" />
      <div className="flex min-w-0 flex-col">
        <span className={smallCapsClass}>{label}</span>
        <span className="text-[21px] font-bold leading-tight">{value}</span>
      </div>
    </div>
  )
}

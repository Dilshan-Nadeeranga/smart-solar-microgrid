import { useNow } from '../../bookings/context'
import { AlertCircleIcon, RefreshIcon } from '../icons'
import { formatRelative } from '../time'
import { focusRing } from './styles'

/**
 * "Updated 12s ago" plus a refresh button. Ticks on its own each second so the
 * rest of the page does not re-render. `stale` = the last refresh failed.
 */
export default function UpdatedAgo({ updatedAt, fetching, stale, onRefresh }) {
  const now = useNow(1_000)

  return (
    <div className="flex items-center gap-2 text-xs text-(--dash-text-2)">
      <p aria-live="polite" className="flex items-center gap-1.5">
        {stale && !fetching && (
          <span className="inline-flex items-center gap-1 font-semibold text-(--dash-amber)">
            <AlertCircleIcon className="h-3.5 w-3.5" />
            Refresh failed ·
          </span>
        )}
        {fetching && !updatedAt ? (
          'Loading…'
        ) : updatedAt ? (
          <time dateTime={new Date(updatedAt).toISOString()} title={new Date(updatedAt).toLocaleString()}>
            Updated {formatRelative(updatedAt, now)}
          </time>
        ) : null}
      </p>
      <button
        type="button"
        onClick={onRefresh}
        disabled={fetching}
        aria-label={fetching ? 'Refreshing dashboard' : 'Refresh dashboard'}
        title="Refresh"
        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-(--dash-border) bg-(--dash-surface) text-(--dash-text-2) hover:text-(--dash-text) disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
      >
        <RefreshIcon className={`h-4 w-4 ${fetching ? 'animate-spin motion-reduce:animate-none' : ''}`} />
      </button>
    </div>
  )
}

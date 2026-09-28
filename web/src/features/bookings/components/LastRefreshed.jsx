import { formatClock, formatUtc } from '../time'
import { Button } from './ui'

/** "Last refreshed 14:32:05" plus a manual Refresh button. Updates every 30 s automatically. */
export default function LastRefreshed({ updatedAt, fetching, onRefresh }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-xs text-secondary" aria-live="polite">
        {fetching ? (
          'Refreshing…'
        ) : updatedAt ? (
          <>
            Last refreshed{' '}
            <time dateTime={new Date(updatedAt).toISOString()} title={formatUtc(updatedAt)} className="font-semibold text-on-surface">
              {formatClock(updatedAt)}
            </time>
            <span className="sr-only"> Sri Lanka time</span>
          </>
        ) : null}
      </p>
      <Button size="sm" icon="refresh" onClick={onRefresh} disabled={fetching} aria-label="Refresh now">
        Refresh
      </Button>
    </div>
  )
}

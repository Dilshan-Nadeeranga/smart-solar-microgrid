import { describeError } from '../../bookings/bookingsApi'
import { AlertCircleIcon, RefreshIcon } from '../icons'
import { focusRing } from './styles'

/**
 * "Couldn't load this. Retry" for one card or section, so a failure never
 * blanks the rest of the dashboard. A 403 cannot be fixed by retrying.
 */
export default function SectionError({ error, onRetry, retrying = false, className = '' }) {
  const info = describeError(error)
  const canRetry = onRetry && info.kind !== 'forbidden'

  return (
    <div role="alert" className={`flex flex-wrap items-center gap-x-3 gap-y-2 text-sm ${className}`}>
      <span className="flex items-center gap-2 font-semibold text-(--dash-red)">
        <AlertCircleIcon className="h-[18px] w-[18px] shrink-0" />
        Couldn&apos;t load this.
      </span>
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-(--dash-border) bg-(--dash-surface) px-2.5 py-1 text-xs font-semibold text-(--dash-text) hover:bg-(--dash-bg) disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
        >
          <RefreshIcon className={`h-3.5 w-3.5 ${retrying ? 'animate-spin motion-reduce:animate-none' : ''}`} />
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      )}
      <span className="w-full text-xs text-(--dash-text-2)">{info.message}</span>
    </div>
  )
}

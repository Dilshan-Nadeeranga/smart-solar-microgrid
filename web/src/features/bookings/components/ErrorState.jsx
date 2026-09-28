import { describeError } from '../bookingsApi'
import { Button, Icon } from './ui'

/**
 * Full error state (nothing to show) or a compact banner (stale data on screen).
 * A 403 shows a permission message without Retry, since retrying cannot help.
 */
export default function ErrorState({ error, onRetry, retrying = false, variant = 'block', title }) {
  const info = describeError(error)
  const forbidden = info.kind === 'forbidden'
  const heading = title ?? (forbidden ? 'Access denied' : 'Could not load data')

  if (variant === 'banner') {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
      >
        <Icon name="error" className="text-[20px]" />
        <p className="min-w-0 flex-1">
          <span className="font-semibold">Showing the last loaded data.</span> {info.message}
        </p>
        {onRetry && !forbidden && (
          <Button size="sm" icon="refresh" onClick={onRetry} loading={retrying} loadingText="Retrying…">
            Retry
          </Button>
        )}
      </div>
    )
  }

  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full ${forbidden ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-800'}`}
      >
        <Icon name={forbidden ? 'lock' : 'cloud_off'} className="text-[26px]" />
      </div>
      <div className="flex max-w-md flex-col gap-1">
        <p className="text-base font-semibold text-on-surface">{heading}</p>
        <p className="text-sm text-secondary">{info.message}</p>
      </div>
      {onRetry && !forbidden && (
        <Button variant="primary" icon="refresh" onClick={onRetry} loading={retrying} loadingText="Retrying…">
          Retry
        </Button>
      )}
    </div>
  )
}

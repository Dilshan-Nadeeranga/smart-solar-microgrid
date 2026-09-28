import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { bookingsApi } from '../bookingsApi'
import { BOOKINGS_KEY, queryKeys, useSummary } from '../context'
import { invalidateQueries, useQuery } from '../query'
import { STATUS } from '../status'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LastRefreshed from '../components/LastRefreshed'
import ReservationTable from '../components/ReservationTable'
import TableSkeleton from '../components/TableSkeleton'
import { cardClass, focusRing } from '../components/styles'
import { Icon } from '../components/ui'

const LATEST_PENDING_PARAMS = { status: STATUS.Pending, page: 1, pageSize: 5 }

function KpiCard({ to, label, value, icon, tone, hint, loading, linkLabel }) {
  return (
    <Link
      to={to}
      aria-label={`${label}: ${loading ? 'loading' : value}. ${linkLabel}`}
      className={`${cardClass} group flex items-center gap-4 p-5 transition-shadow hover:shadow-md ${focusRing}`}
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon name={icon} className="text-[26px]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold text-secondary">{label}</span>
        {loading ? (
          <span className="my-1 h-8 w-16 animate-pulse rounded bg-surface-container-high motion-reduce:animate-none" />
        ) : (
          <span className="text-3xl font-bold text-on-surface">{value}</span>
        )}
        <span className="text-xs text-secondary">{hint}</span>
      </div>
      <span className="flex items-center gap-1 text-xs font-semibold text-primary" aria-hidden="true">
        {linkLabel}
        <Icon name="arrow_forward" className="text-[18px] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </span>
    </Link>
  )
}

export default function BookingsDashboardPage() {
  const summary = useSummary()
  const latest = useQuery(queryKeys.list(LATEST_PENDING_PARAMS), () => bookingsApi.list(LATEST_PENDING_PARAMS))

  useEffect(() => {
    document.title = 'Bookings dashboard · Smart Solar Microgrid'
  }, [])

  const updatedAt = Math.max(summary.updatedAt, latest.updatedAt)
  const fetching = summary.isFetching || latest.isFetching
  const refreshAll = () => invalidateQueries(BOOKINGS_KEY)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-on-surface">Overview</h2>
        <LastRefreshed updatedAt={updatedAt} fetching={fetching} onRefresh={refreshAll} />
      </div>

      {summary.isError ? (
        <section className={cardClass} aria-label="Booking counts">
          <ErrorState error={summary.error} onRetry={summary.refetch} retrying={summary.isFetching} title="Could not load booking counts" />
        </section>
      ) : (
        <section aria-label="Booking counts" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <KpiCard
            to="/bookings/pending"
            label="Pending approval"
            value={summary.data?.pendingCount ?? 0}
            icon="pending_actions"
            tone="bg-amber-100 text-amber-900"
            hint="Reservations waiting for a decision"
            linkLabel="Review"
            loading={summary.isLoading}
          />
          <KpiCard
            to={`/bookings/all?status=${STATUS.Approved}`}
            label="Approved upcoming"
            value={summary.data?.approvedFutureCount ?? 0}
            icon="event_available"
            tone="bg-emerald-100 text-emerald-900"
            hint="Approved reservations with a future slot"
            linkLabel="View approved"
            loading={summary.isLoading}
          />
        </section>
      )}
      {summary.error && !summary.isError && (
        <ErrorState variant="banner" error={summary.error} onRetry={summary.refetch} retrying={summary.isFetching} />
      )}

      <section className={`${cardClass} overflow-hidden`} aria-labelledby="latest-pending-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 px-4 py-4 lg:px-6">
          <div className="flex flex-col">
            <h2 id="latest-pending-heading" className="text-base font-bold text-on-surface">
              Latest pending reservations
            </h2>
            <p className="text-xs text-secondary">The 5 most recent requests waiting for approval</p>
          </div>
          <Link
            to="/bookings/pending"
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-primary hover:underline ${focusRing}`}
          >
            View all pending
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        </div>

        {latest.error && !latest.isError && (
          <div className="p-4">
            <ErrorState variant="banner" error={latest.error} onRetry={latest.refetch} retrying={latest.isFetching} />
          </div>
        )}

        {latest.isLoading ? (
          <TableSkeleton rows={5} columns={7} label="Loading pending reservations" />
        ) : latest.isError ? (
          <ErrorState error={latest.error} onRetry={latest.refetch} retrying={latest.isFetching} title="Could not load pending reservations" />
        ) : latest.data.items.length === 0 ? (
          <EmptyState
            icon="task_alt"
            title="All caught up"
            description="There are no reservations waiting for approval."
          />
        ) : (
          <ReservationTable caption="Latest pending reservations" rows={latest.data.items} showActions />
        )}
      </section>
    </div>
  )
}

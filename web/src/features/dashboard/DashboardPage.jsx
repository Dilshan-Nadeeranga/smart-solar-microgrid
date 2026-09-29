import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useNow } from '../bookings/context'
import { BOOKINGS_ROLES } from '../bookings/permissions'
import AllCaughtUp from './components/AllCaughtUp'
import QuickActions from './components/QuickActions'
import RecentActivity from './components/RecentActivity'
import Section from './components/Section'
import SectionError from './components/SectionError'
import { StatCardSkeleton } from './components/Skeleton'
import { AttentionCard, InfraCard, SnapshotCard } from './components/StatCards'
import { cardClass, cardRowClass, focusRing, formatCount } from './components/styles'
import UpdatedAgo from './components/UpdatedAgo'
import {
  refreshDashboard,
  useCapacityAlerts,
  useInfrastructure,
  usePendingActivations,
  useRecentActivity,
  useReservationSummary,
  useTodayOperations,
} from './hooks'
import {
  BatteryAlertIcon,
  BatteryIcon,
  ClockIcon,
  LogInIcon,
  StationIcon,
  SunIcon,
  UserCheckIcon,
} from './icons'
import { greetingFor } from './time'
import './dashboard.css'

function displayName(user) {
  const first = user?.name?.trim().split(/\s+/)[0]
  if (first) return first
  return user?.role === 'BACKOFFICE' ? 'BackOfficer' : ''
}

/** Shown instead of the staff-only sections to signed-out desk users and prosumers. */
function StaffOnlyNotice({ signedIn }) {
  return (
    <div className={`${cardClass} flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm text-(--dash-text-2)`}>
      <p>Approvals, account activations and today&apos;s operations are available to BackOffice staff.</p>
      {!signedIn && (
        <Link
          to="/login"
          className={`inline-flex items-center gap-1.5 rounded-lg border border-(--dash-border) px-3 py-1.5 font-semibold text-(--dash-text) hover:bg-(--dash-bg) ${focusRing}`}
        >
          <LogInIcon className="h-4 w-4" />
          Sign in
        </Link>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const isBackoffice = user?.role === 'BACKOFFICE'
  // /dashboard is also open to the signed-out station desk; only staff may call these endpoints.
  const isStaff = BOOKINGS_ROLES.includes(user?.role)

  const now = useNow(60_000)
  const summary = useReservationSummary(isStaff)
  const activations = usePendingActivations(isBackoffice)
  const operations = useTodayOperations(isStaff, now)
  const infra = useInfrastructure()
  const capacity = useCapacityAlerts()
  const activity = useRecentActivity()

  useEffect(() => {
    document.title = 'Dashboard · Smart Solar Microgrid'
  }, [])

  const sources = [infra, ...(isStaff ? [summary, operations] : []), ...(isBackoffice ? [activations] : [])]
  const updatedAt = Math.max(0, ...sources.map((source) => source.updatedAt))
  const fetching = sources.some((source) => source.isFetching)
  const refreshFailed = sources.some((source) => source.error)

  const attentionCards = [
    {
      key: 'approvals',
      to: '/bookings/pending',
      label: 'Pending Approvals',
      icon: ClockIcon,
      tone: 'amber',
      linkLabel: 'Review now',
      query: summary,
      value: summary.data?.pendingCount,
    },
    isBackoffice && {
      key: 'activations',
      to: '/dashboard/users/pending',
      label: 'Pending Activations',
      icon: UserCheckIcon,
      tone: 'orange',
      linkLabel: 'Activate',
      query: activations,
      value: activations.data,
    },
    {
      key: 'capacity',
      // TODO: link to the alerting station once StationsPage accepts a station id in the URL.
      to: '/dashboard/stations',
      label: 'Slot Capacity Alerts',
      icon: BatteryAlertIcon,
      tone: 'blue',
      linkLabel: 'View station',
      unavailable: !capacity.available,
      value: capacity.count,
      note: 'Alerts are not connected yet',
    },
  ].filter(Boolean)

  // Sources that are not connected yet cannot confirm "nothing to do", so they are skipped.
  const counted = attentionCards.filter((card) => !card.unavailable)
  const allCaughtUp = counted.every(
    (card) => card.query.data !== undefined && !card.query.error && card.value === 0,
  )

  const greeting = greetingFor(new Date(now))
  const name = displayName(user)

  return (
    <div className="dash relative w-full">
      {/* Warm page background for the dashboard content area only (the shell keeps its own). */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-(--dash-bg) lg:left-60" />

      <div className="relative flex flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">
              {greeting}
              {name && `, ${name}`}
            </h1>
            <p className="text-sm text-(--dash-text-2)">Here&apos;s what needs your attention today</p>
          </div>
          <UpdatedAgo updatedAt={updatedAt} fetching={fetching} stale={refreshFailed} onRefresh={refreshDashboard} />
        </header>

        {!isStaff ? (
          <StaffOnlyNotice signedIn={Boolean(user)} />
        ) : allCaughtUp ? (
          <AllCaughtUp />
        ) : (
          <Section id="dash-attention" label="Needs your attention">
            <div className={cardRowClass}>
              {attentionCards.map(({ key, ...card }) => (
                <AttentionCard key={key} {...card} />
              ))}
            </div>
          </Section>
        )}

        {isStaff && (
          <Section id="dash-operations" label="Operations snapshot">
            <div className={cardRowClass}>
              <SnapshotCard
                label="Reservations Today"
                value={operations.data?.reservationsToday}
                trendPercent={operations.data?.trendPercent}
                query={operations}
              />
              <SnapshotCard label="Completed Today" value={operations.data?.completedToday} query={operations} />
              <SnapshotCard label="Approved (Future)" value={summary.data?.approvedFutureCount} query={summary} />
            </div>
          </Section>
        )}

        <Section id="dash-infrastructure" label="Infrastructure">
          {infra.isError ? (
            <div className={`${cardClass} p-4`}>
              <SectionError error={infra.error} onRetry={infra.refetch} retrying={infra.isFetching} />
            </div>
          ) : (
            <div className={cardRowClass}>
              {infra.isLoading ? (
                [0, 1, 2].map((item) => <StatCardSkeleton key={item} size="sm" label="Loading infrastructure" />)
              ) : (
                <>
                  <InfraCard label="Stations" value={formatCount(infra.totals.stations)} icon={StationIcon} />
                  <InfraCard label="Nominal Output" value={`${formatCount(infra.totals.capacityKw)} kW`} icon={SunIcon} />
                  <InfraCard label="Battery Slots" value={formatCount(infra.totals.batterySlots)} icon={BatteryIcon} />
                </>
              )}
            </div>
          )}
        </Section>

        <div className="flex flex-col gap-5 min-[900px]:flex-row min-[900px]:items-start">
          <div className="min-w-0 flex-1">
            <RecentActivity activity={activity} />
          </div>
          <div className="min-[900px]:w-80 min-[900px]:shrink-0">
            <QuickActions isBackoffice={isBackoffice} />
          </div>
        </div>
      </div>
    </div>
  )
}

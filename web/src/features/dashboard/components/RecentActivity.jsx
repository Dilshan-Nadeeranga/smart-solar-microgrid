import { useNow } from '../../bookings/context'
import { parseUtc } from '../../bookings/time'
import { ActivityIcon, CalendarCheckIcon, CheckCircleIcon, PencilIcon, UserCheckIcon, XCircleIcon } from '../icons'
import { formatRelative } from '../time'
import SectionError from './SectionError'
import { SkeletonBlock } from './Skeleton'
import { cardClass, tones } from './styles'

/** Event kinds the future activity feed may return; unknown kinds fall back to a neutral row. */
const ACTIVITY_KINDS = {
  reservation_approved: { icon: CheckCircleIcon, tone: 'green', label: 'Reservation approved' },
  reservation_rejected: { icon: XCircleIcon, tone: 'orange', label: 'Reservation rejected' },
  reservation_completed: { icon: CalendarCheckIcon, tone: 'blue', label: 'Reservation completed' },
  station_updated: { icon: PencilIcon, tone: 'neutral', label: 'Station updated' },
  prosumer_activated: { icon: UserCheckIcon, tone: 'amber', label: 'Prosumer activated' },
}
const FALLBACK_KIND = { icon: ActivityIcon, tone: 'neutral', label: 'Activity' }

function ActivityRow({ item, now }) {
  const kind = ACTIVITY_KINDS[item.kind] ?? FALLBACK_KIND
  const Icon = kind.icon
  const date = parseUtc(item.occurredAtUtc)

  return (
    <li className="flex items-center gap-3 py-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tones[kind.tone].badge}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="min-w-0 flex-1 text-sm">
        <span className="sr-only">{kind.label}: </span>
        {item.message || kind.label}
      </p>
      {date && (
        <time dateTime={date.toISOString()} title={date.toLocaleString()} className="shrink-0 text-xs text-(--dash-text-3)">
          {formatRelative(date.getTime(), now)}
        </time>
      )}
    </li>
  )
}

export default function RecentActivity({ activity }) {
  const now = useNow(30_000)

  return (
    <section aria-labelledby="dash-activity-heading" className={`${cardClass} flex flex-col p-5`}>
      <h2 id="dash-activity-heading" className="text-base font-bold">
        Recent Activity
      </h2>

      {activity.isLoading ? (
        <ul className="mt-2 divide-y divide-(--dash-border)" aria-label="Loading recent activity">
          {[0, 1, 2].map((row) => (
            <li key={row} className="flex items-center gap-3 py-3">
              <SkeletonBlock className="h-8 w-8 rounded-full" />
              <SkeletonBlock className="h-4 flex-1" />
              <SkeletonBlock className="h-3 w-10" />
            </li>
          ))}
        </ul>
      ) : activity.isError ? (
        <SectionError className="mt-4" error={activity.error} onRetry={activity.refetch} />
      ) : activity.items.length === 0 ? (
        <div role="status" className="flex flex-col items-center gap-2 px-4 py-10 text-center">
          <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tones.neutral.badge}`}>
            <ActivityIcon className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold">No recent activity yet</p>
          <p className="max-w-xs text-xs text-(--dash-text-2)">
            Reservation decisions, station updates and account activations will show up here.
          </p>
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-(--dash-border)">
          {activity.items.map((item) => (
            <ActivityRow key={item.id} item={item} now={now} />
          ))}
        </ul>
      )}
    </section>
  )
}

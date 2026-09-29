import { stationsApi, usersApi } from '../../api'
import { bookingsApi } from '../bookings/bookingsApi'
import { queryKeys } from '../bookings/context'
import { invalidateQueries, useQuery } from '../bookings/query'
import { STATUS } from '../bookings/status'

/*
 * Data hooks for the BackOffice dashboard. They reuse the Bookings query cache
 * (30 s polling, refetch on window focus, 401 -> login), so the summary is shared
 * with the Bookings pages and refreshed by their approve / reject invalidations.
 */

export const DASHBOARD_KEY = 'dashboard:'
const STATIONS_KEY = 'stations:list'
const DAY_MS = 24 * 60 * 60 * 1000

/** "YYYY-MM-DD" in UTC, the format and time zone the reservations `dateUtc` filter uses. */
const utcDay = (time) => new Date(time).toISOString().slice(0, 10)

/** Member 4: pending + approved-future reservation counts (staff only). */
export function useReservationSummary(enabled) {
  return useQuery(queryKeys.summary(), () => bookingsApi.getSummary(), { enabled })
}

/** Member 1: number of accounts waiting for activation (BACKOFFICE only). */
export function usePendingActivations(enabled) {
  return useQuery(
    `${DASHBOARD_KEY}pending-activations`,
    async () => {
      const users = await usersApi.getPending()
      return Array.isArray(users) ? users.length : 0
    },
    { enabled },
  )
}

/**
 * Member 4 list endpoint, counted via `totalCount`. "Today" is the UTC day of the
 * slot start, because that is what the API filters on. The yesterday count only
 * feeds the trend chip, so its failure hides the chip instead of the card.
 */
export function useTodayOperations(enabled, now) {
  const today = utcDay(now)
  const yesterday = utcDay(now - DAY_MS)

  return useQuery(
    `${DASHBOARD_KEY}operations:${today}`,
    async () => {
      const count = (params) => bookingsApi.list({ ...params, page: 1, pageSize: 1 }).then((page) => page.totalCount)
      const [reservationsToday, completedToday, reservationsYesterday] = await Promise.all([
        count({ dateUtc: today }),
        count({ dateUtc: today, status: STATUS.Completed }),
        count({ dateUtc: yesterday }).catch(() => null),
      ])
      return {
        reservationsToday,
        completedToday,
        trendPercent: percentChange(reservationsToday, reservationsYesterday),
      }
    },
    { enabled },
  )
}

/** null when there is no usable baseline, so the chip is omitted. */
function percentChange(current, previous) {
  if (typeof previous !== 'number' || previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

/** Member 2: active stations and their totals (same source as the previous dashboard). */
export function useInfrastructure() {
  const query = useQuery(STATIONS_KEY, () => stationsApi.list())
  const stations = Array.isArray(query.data) ? query.data : []
  return {
    ...query,
    totals: {
      stations: stations.length,
      capacityKw: stations.reduce((sum, station) => sum + Number(station.capacityKw || 0), 0),
      batterySlots: stations.reduce((sum, station) => sum + Number(station.batteryStorageSlots || 0), 0),
    },
  }
}

/**
 * Slot capacity alerts.
 * TODO: No endpoint exists yet. GET /api/stations/{id}/slots only returns slots that
 * still have room, so full slots cannot be detected on the client. Needed:
 * GET /api/stations/capacity-alerts -> [{ stationId, stationName, slotId, startTimeUtc,
 * reservedBookings, maximumBookings }] for upcoming slots at or near capacity.
 * Until then the card renders as "not connected" and is left out of the
 * "all caught up" check.
 */
export function useCapacityAlerts() {
  return { available: false, count: null, stationId: null }
}

/**
 * Recent activity feed.
 * TODO: No endpoint exists yet. Needed: GET /api/activity?limit=10 ->
 * [{ id, kind, message, occurredAtUtc }] where kind is one of the ACTIVITY_KINDS
 * keys in RecentActivity.jsx. Returns an empty list until then; never fake data here.
 */
export function useRecentActivity() {
  return { items: [], isLoading: false, isError: false, error: null, refetch: () => {} }
}

/** Refreshes every dashboard source (summary, activations, operations, stations). */
export function refreshDashboard() {
  invalidateQueries(DASHBOARD_KEY)
  invalidateQueries(queryKeys.summary())
  invalidateQueries(STATIONS_KEY)
}

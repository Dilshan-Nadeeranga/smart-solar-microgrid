import { createContext, useContext, useEffect, useState } from 'react'
import { stationsApi, usersApi } from '../../api'
import { bookingsApi } from './bookingsApi'
import { useQuery } from './query'

/**
 * Provided by BookingsLayout:
 *   canApprove                     whether Approve / Reject are shown (UI only)
 *   pendingAction(id)              'approve' | 'reject' | undefined while a request runs
 *   approve(reservation)           Promise<boolean>
 *   requestReject(reservation)     opens the reject confirmation
 *   openReservation(id)            opens the detail drawer
 */
export const BookingsContext = createContext(null)

export function useBookings() {
  const value = useContext(BookingsContext)
  if (!value) throw new Error('useBookings must be used inside BookingsLayout')
  return value
}

/** URL search param that holds the reservation id shown in the drawer. */
export const DRAWER_PARAM = 'reservation'

/** Every Member 4 cache key starts with this, so one call refreshes them all. */
export const BOOKINGS_KEY = 'bookings:'

export const queryKeys = {
  summary: () => `${BOOKINGS_KEY}summary`,
  list: (params) => `${BOOKINGS_KEY}list:${JSON.stringify(params)}`,
  detail: (id) => `${BOOKINGS_KEY}detail:${id}`,
  // Review data sits under the same prefix so approve / reject refresh it too.
  slot: (id) => `${BOOKINGS_KEY}slot:${id}`,
  station: (id) => `${BOOKINGS_KEY}station:${id}`,
  prosumer: (nic) => `${BOOKINGS_KEY}prosumer:${nic}`,
}

export function useSummary() {
  return useQuery(queryKeys.summary(), () => bookingsApi.getSummary())
}

/** Member 2 stations, for the filter dropdown and station names. */
export function useStations() {
  const query = useQuery('stations:list', () => stationsApi.list(), { refetchInterval: false })
  const stations = Array.isArray(query.data) ? query.data : []
  return {
    ...query,
    stations,
    nameById: new Map(stations.map((station) => [station.id, station.name])),
  }
}

/** Member 3 slot (capacity, times, active) for the review panel. */
export function useSlot(slotId) {
  return useQuery(queryKeys.slot(slotId), () => stationsApi.getSlot(slotId), { enabled: Boolean(slotId) })
}

/** Member 2 station details for the review panel. */
export function useStation(stationId) {
  return useQuery(queryKeys.station(stationId), () => stationsApi.get(stationId), { enabled: Boolean(stationId) })
}

/** Member 1 prosumer profile. The API allows Backoffice only, so other roles pass enabled = false. */
export function useProsumer(nic, enabled) {
  return useQuery(queryKeys.prosumer(nic), () => usersApi.getProfile(encodeURIComponent(nic)), {
    enabled: Boolean(nic) && enabled,
  })
}

/** Current time, updated every `intervalMs` (for "slot has not started" checks). */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

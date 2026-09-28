import { createContext, useContext } from 'react'
import { stationsApi } from '../../api'
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

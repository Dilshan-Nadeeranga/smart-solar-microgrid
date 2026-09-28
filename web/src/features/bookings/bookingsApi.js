import { ApiError, request } from '../../api'
import { toStatus } from './status'

/**
 * Member 4 API client (staff web). /api/reservations/mine is Android-only and
 * the QR endpoints are scanned on Android, so they are not wrapped here.
 *
 * @typedef {'Pending'|'Approved'|'Cancelled'|'Rejected'|'Completed'} ReservationStatus
 *
 * @typedef {Object} Reservation
 * @property {string} id
 * @property {string} prosumerId
 * @property {string} stationId
 * @property {string|null} stationName
 * @property {string} slotId
 * @property {ReservationStatus|null} status
 * @property {string|null} createdAtUtc
 * @property {string|null} updatedAtUtc
 * @property {string|null} cancelledAtUtc
 * @property {string|null} approvedAtUtc
 * @property {string|null} rejectedAtUtc
 * @property {string|null} completedAtUtc
 * @property {string|null} completedByOperatorId
 * @property {number|null} version
 * @property {string|null} slotStartTimeUtc
 * @property {string|null} slotEndTimeUtc
 *
 * @typedef {Object} ReservationSummary
 * @property {string} scope "All" for staff
 * @property {number} pendingCount
 * @property {number} approvedFutureCount
 *
 * @typedef {Object} ReservationPage
 * @property {Reservation[]} items
 * @property {number} page
 * @property {number} pageSize
 * @property {number} totalCount
 * @property {number} totalPages
 *
 * @typedef {Object} ReservationListParams
 * @property {ReservationStatus} [status]
 * @property {string} [stationId]
 * @property {string} [dateUtc] slot start date in UTC, "YYYY-MM-DD"
 * @property {string} [reference] full reservation id (24 hex characters)
 * @property {string} [q] station name text or a full reservation id
 * @property {number} [page]
 * @property {number} [pageSize]
 */

export const PAGE_SIZES = [10, 20, 50]
export const DEFAULT_PAGE_SIZE = 20

const RESERVATION_ID = /^[a-f\d]{24}$/i

/** True when the text is a full reservation id the API accepts as `reference`. */
export const isReservationId = (text) => RESERVATION_ID.test(text.trim())

/** @returns {Reservation} */
export function normalizeReservation(raw = {}) {
  return {
    id: raw.id ?? raw.Id ?? '',
    prosumerId: raw.prosumerId ?? '',
    stationId: raw.stationId ?? '',
    stationName: raw.stationName ?? null,
    slotId: raw.slotId ?? '',
    status: toStatus(raw.status),
    createdAtUtc: raw.createdAtUtc ?? null,
    updatedAtUtc: raw.updatedAtUtc ?? null,
    cancelledAtUtc: raw.cancelledAtUtc ?? null,
    approvedAtUtc: raw.approvedAtUtc ?? null,
    rejectedAtUtc: raw.rejectedAtUtc ?? null,
    completedAtUtc: raw.completedAtUtc ?? null,
    completedByOperatorId: raw.completedByOperatorId ?? null,
    version: typeof raw.version === 'number' ? raw.version : null,
    slotStartTimeUtc: raw.slotStartTimeUtc ?? null,
    slotEndTimeUtc: raw.slotEndTimeUtc ?? null,
  }
}

function toQuery(params) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

const actionBody = (version) =>
  JSON.stringify(typeof version === 'number' ? { version } : {})

export const bookingsApi = {
  /** GET /api/reservations/summary @returns {Promise<ReservationSummary>} */
  async getSummary() {
    const data = await request('/reservations/summary')
    return {
      scope: data?.scope ?? '',
      pendingCount: Number(data?.pendingCount ?? 0),
      approvedFutureCount: Number(data?.approvedFutureCount ?? 0),
    }
  },

  /**
   * GET /api/reservations (staff, filtered and paged)
   * @param {ReservationListParams} params
   * @returns {Promise<ReservationPage>}
   */
  async list(params = {}) {
    const data = await request(`/reservations${toQuery(params)}`)
    return {
      items: Array.isArray(data?.items) ? data.items.map(normalizeReservation) : [],
      page: Number(data?.page ?? params.page ?? 1),
      pageSize: Number(data?.pageSize ?? params.pageSize ?? DEFAULT_PAGE_SIZE),
      totalCount: Number(data?.totalCount ?? 0),
      totalPages: Number(data?.totalPages ?? 0),
    }
  },

  /** GET /api/reservations/{id} (Member 3 endpoint) @returns {Promise<Reservation>} */
  async get(id) {
    const data = await request(`/reservations/${encodeURIComponent(id)}`)
    return normalizeReservation(data?.reservation ?? data)
  },

  /** PATCH /api/reservations/{id}/approve @returns {Promise<Reservation>} */
  async approve(id, version) {
    const data = await request(`/reservations/${encodeURIComponent(id)}/approve`, {
      method: 'PATCH',
      body: actionBody(version),
    })
    return normalizeReservation(data?.reservation)
  },

  /** PATCH /api/reservations/{id}/reject (releases slot capacity) @returns {Promise<Reservation>} */
  async reject(id, version) {
    const data = await request(`/reservations/${encodeURIComponent(id)}/reject`, {
      method: 'PATCH',
      body: actionBody(version),
    })
    return normalizeReservation(data?.reservation)
  },
}

/**
 * Turns any thrown value into a UI-friendly error.
 * @returns {{ kind: 'auth'|'forbidden'|'notFound'|'conflict'|'invalid'|'network'|'server', status: number, message: string }}
 */
export function describeError(error) {
  const status = error instanceof ApiError ? error.status : -1
  const serverMessage = error?.data?.message

  switch (status) {
    case 401:
      return { kind: 'auth', status, message: 'Your session has expired. Please log in again.' }
    case 403:
      return {
        kind: 'forbidden',
        status,
        message: 'You do not have permission to do this. Ask a Backoffice administrator if you need access.',
      }
    case 404:
      return { kind: 'notFound', status, message: serverMessage || 'This reservation could not be found.' }
    case 409:
      return {
        kind: 'conflict',
        status,
        message: 'This reservation was already handled by someone else. The latest data has been loaded.',
      }
    case 400:
      return { kind: 'invalid', status, message: serverMessage || 'The request was not valid.' }
    case 0:
      return { kind: 'network', status, message: error.message }
    default:
      return {
        kind: 'server',
        status,
        message: serverMessage || error?.message || 'Something went wrong. Please try again.',
      }
  }
}

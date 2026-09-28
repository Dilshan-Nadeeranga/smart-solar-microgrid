import { STATUS } from './status'
import { parseUtc } from './time'

/*
 * Pre-approval checks shown in the review panel. They run in the UI only;
 * the API still enforces Pending-only approval and the version check.
 *
 * Each check: { key, label, state, detail }
 *   state: 'pass' | 'fail' | 'info' | 'loading' | 'error'
 *   'fail' and 'error' block approval; 'info' does not.
 */

/** @param {{ data?: any, isLoading: boolean, isError: boolean }} query */
function fromQuery(query, evaluate, { loadingLabel, errorDetail }) {
  if (query.isLoading) return { state: 'loading', detail: loadingLabel }
  if (query.isError) return { state: 'error', detail: errorDetail }
  return evaluate(query.data)
}

/**
 * @param {object} args
 * @param {import('./bookingsApi').Reservation} args.reservation
 * @param {object} args.slotQuery      useQuery result for GET /booking-slots/{id}
 * @param {object} args.stationQuery   useQuery result for GET /stations/{id}
 * @param {object|null} args.prosumerQuery useQuery result for GET /users/{nic}, or null when the role cannot read it
 * @param {number} args.now            current time in ms
 */
export function buildChecks({ reservation, slotQuery, stationQuery, prosumerQuery, now }) {
  const checks = []

  checks.push({
    key: 'status',
    label: 'Booking is still pending',
    ...(reservation.status === STATUS.Pending
      ? { state: 'pass', detail: 'No one has approved, rejected or cancelled it yet.' }
      : { state: 'fail', detail: `It is now ${reservation.status ?? 'in an unknown state'}.` }),
  })

  const slotOptions = { loadingLabel: 'Loading slot…', errorDetail: 'Slot details could not be loaded.' }

  checks.push({
    key: 'slotFuture',
    label: 'Slot has not started yet',
    ...fromQuery(
      slotQuery,
      (slot) => {
        const start = parseUtc(slot?.startTimeUtc ?? reservation.slotStartTimeUtc)
        if (!start) return { state: 'error', detail: 'The slot has no start time.' }
        return start.getTime() > now
          ? { state: 'pass', detail: 'The slot is in the future.' }
          : { state: 'fail', detail: 'The slot start time has already passed.' }
      },
      slotOptions,
    ),
  })

  checks.push({
    key: 'slotActive',
    label: 'Slot is active and belongs to the station',
    ...fromQuery(
      slotQuery,
      (slot) => {
        if (slot?.isActive === false) return { state: 'fail', detail: 'This slot has been deactivated.' }
        if (slot?.stationId && reservation.stationId && slot.stationId !== reservation.stationId) {
          return { state: 'fail', detail: 'The slot belongs to a different station than the booking.' }
        }
        return { state: 'pass', detail: 'The slot is open for bookings at this station.' }
      },
      slotOptions,
    ),
  })

  checks.push({
    key: 'capacity',
    label: 'Slot is not overbooked',
    ...fromQuery(
      slotQuery,
      (slot) => {
        const max = Number(slot?.maximumBookings)
        const reserved = Number(slot?.reservedBookings)
        if (!Number.isFinite(max) || !Number.isFinite(reserved)) {
          return { state: 'error', detail: 'Slot capacity is unknown.' }
        }
        // This pending booking already holds one of the reserved places.
        return reserved <= max
          ? { state: 'pass', detail: `${reserved} of ${max} places booked, including this one.` }
          : { state: 'fail', detail: `${reserved} bookings for only ${max} places.` }
      },
      slotOptions,
    ),
  })

  checks.push({
    key: 'stationActive',
    label: 'Station is active',
    ...fromQuery(
      stationQuery,
      (station) =>
        station?.isActive === false
          ? { state: 'fail', detail: 'This station has been deactivated.' }
          : { state: 'pass', detail: 'The station is accepting bookings.' },
      { loadingLabel: 'Loading station…', errorDetail: 'Station details could not be loaded.' },
    ),
  })

  if (prosumerQuery) {
    checks.push({
      key: 'prosumer',
      label: 'Prosumer account is active',
      ...fromQuery(
        prosumerQuery,
        (prosumer) => {
          const status = String(prosumer?.accountStatus ?? '').toUpperCase()
          if (status === 'ACTIVE') return { state: 'pass', detail: 'The account is active.' }
          return { state: 'fail', detail: `The account is ${status ? status.toLowerCase() : 'in an unknown state'}.` }
        },
        { loadingLabel: 'Loading prosumer…', errorDetail: 'Prosumer details could not be loaded.' },
      ),
    })
  } else {
    checks.push({
      key: 'prosumer',
      label: 'Prosumer identity',
      state: 'info',
      detail: `Prosumer details are available to Backoffice only. Verify NIC ${reservation.prosumerId || '—'} if needed.`,
    })
  }

  const loading = checks.some((check) => check.state === 'loading')
  const blocking = checks.some((check) => check.state === 'fail' || check.state === 'error')

  return { checks, loading, blocking }
}

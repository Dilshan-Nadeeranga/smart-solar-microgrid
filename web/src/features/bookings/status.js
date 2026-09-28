/**
 * Reservation status, matching SolarGrid.Api.Models.ReservationStatus.
 * The API serialises the enum as a string ("Pending"), but numeric values
 * (0 Pending, 1 Approved, 2 Cancelled, 3 Rejected, 4 Completed) are accepted too.
 */
export const STATUS = Object.freeze({
  Pending: 'Pending',
  Approved: 'Approved',
  Cancelled: 'Cancelled',
  Rejected: 'Rejected',
  Completed: 'Completed',
})

const BY_NUMBER = ['Pending', 'Approved', 'Cancelled', 'Rejected', 'Completed']

/** Order shown in filters. */
export const ALL_STATUSES = [
  STATUS.Pending,
  STATUS.Approved,
  STATUS.Rejected,
  STATUS.Cancelled,
  STATUS.Completed,
]

/** Final states listed on the History page. */
export const HISTORY_STATUSES = [STATUS.Completed, STATUS.Rejected, STATUS.Cancelled]

export const STATUS_META = {
  Pending: {
    label: 'Pending',
    icon: 'schedule',
    className: 'bg-amber-100 text-amber-900 ring-amber-300',
    dotClassName: 'bg-amber-500',
  },
  Approved: {
    label: 'Approved',
    icon: 'check_circle',
    className: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
    dotClassName: 'bg-emerald-600',
  },
  Rejected: {
    label: 'Rejected',
    icon: 'cancel',
    className: 'bg-red-100 text-red-900 ring-red-300',
    dotClassName: 'bg-red-600',
  },
  Cancelled: {
    label: 'Cancelled',
    icon: 'block',
    className: 'bg-slate-200 text-slate-800 ring-slate-300',
    dotClassName: 'bg-slate-500',
  },
  Completed: {
    label: 'Completed',
    icon: 'task_alt',
    className: 'bg-blue-100 text-blue-900 ring-blue-300',
    dotClassName: 'bg-blue-600',
  },
}

/** Returns the status name for a string or numeric API value, or null. */
export function toStatus(value) {
  if (typeof value === 'number') return BY_NUMBER[value] ?? null
  if (typeof value !== 'string') return null
  if (/^\d+$/.test(value)) return BY_NUMBER[Number(value)] ?? null
  return ALL_STATUSES.find((status) => status.toLowerCase() === value.trim().toLowerCase()) ?? null
}

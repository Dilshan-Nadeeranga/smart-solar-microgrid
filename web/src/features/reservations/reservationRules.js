export const HOUR_MS = 60 * 60 * 1000;
export const SEVEN_DAYS_MS = 7 * 24 * HOUR_MS;
export const MIN_NOTICE_MS = 12 * HOUR_MS;

export const ACTIVE_STATUSES = ['Pending', 'Approved'];

export function slotAvailability(slot, station, now) {
  const start = new Date(slot.startTimeUtc).getTime();

  if (!station?.isActive) return { bookable: false, reason: 'Station inactive' };
  if (!slot.isActive) return { bookable: false, reason: 'Slot inactive' };
  if (start <= now) return { bookable: false, reason: 'Already started' };
  if (start > now + SEVEN_DAYS_MS) return { bookable: false, reason: 'Beyond 7-day window' };
  if (slot.reservedBookings >= slot.maximumBookings) return { bookable: false, reason: 'Full' };

  return { bookable: true, reason: null };
}

export function modificationWindow(reservation, now) {
  if (!ACTIVE_STATUSES.includes(reservation.status)) {
    return {
      allowed: false,
      deadline: null,
      reason: `${reservation.status} reservations can't be changed or cancelled.`,
    };
  }

  const deadline = new Date(reservation.slotStartTimeUtc).getTime() - MIN_NOTICE_MS;

  if (now > deadline) {
    return {
      allowed: false,
      deadline,
      reason: 'Changes close 12 hours before the booking starts.',
    };
  }

  return { allowed: true, deadline, reason: null };
}

export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

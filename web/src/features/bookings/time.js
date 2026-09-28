export const DISPLAY_TIME_ZONE = 'Asia/Colombo'

const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: DISPLAY_TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: DISPLAY_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const clockFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: DISPLAY_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Parses an API timestamp. Values without an offset are treated as UTC,
 * because every *Utc field from the API is UTC.
 */
export function parseUtc(value) {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'number') return new Date(value)
  const text = String(value)
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(text)
  const date = new Date(hasOffset ? text : `${text}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** "28 Sep 2026, 14:30" in Asia/Colombo. */
export function formatColombo(value) {
  const date = parseUtc(value)
  return date ? dateTimeFormat.format(date) : ''
}

/** "14:30" in Asia/Colombo. */
export function formatColomboTime(value) {
  const date = parseUtc(value)
  return date ? timeFormat.format(date) : ''
}

/** "14:30:05" in Asia/Colombo. */
export function formatClock(value) {
  const date = parseUtc(value)
  return date ? clockFormat.format(date) : ''
}

/** "2026-09-28 09:00 UTC", for tooltips. */
export function formatUtc(value) {
  const date = parseUtc(value)
  if (!date) return ''
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`
}

/** "28 Sep 2026, 14:30 – 15:30" (end date omitted when it is the same day). */
export function formatColomboRange(start, end) {
  const startDate = parseUtc(start)
  const endDate = parseUtc(end)
  if (!startDate) return ''
  if (!endDate) return formatColombo(startDate)
  const sameDay = dayKeyFormat.format(startDate) === dayKeyFormat.format(endDate)
  return `${formatColombo(startDate)} – ${sameDay ? formatColomboTime(endDate) : formatColombo(endDate)}`
}

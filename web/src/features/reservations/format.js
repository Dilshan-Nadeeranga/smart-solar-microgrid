const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});

const longDateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

export const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const formatDate = (value) => dateFormat.format(new Date(value));
export const formatLongDate = (value) => longDateFormat.format(new Date(value));
export const formatMonth = (value) => monthFormat.format(new Date(value));
export const formatTime = (value) => timeFormat.format(new Date(value));
export const formatDateTime = (value) => `${formatDate(value)}, ${formatTime(value)}`;
export const formatTimeRange = (start, end) => `${formatTime(start)} – ${formatTime(end)}`;

export function dayKey(value) {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function dayChipLabel(date, index) {
  return {
    weekday: index === 0 ? 'Today' : weekdayFormat.format(date),
    day: date.getDate(),
  };
}

export function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

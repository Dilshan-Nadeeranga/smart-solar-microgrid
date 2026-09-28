import { formatColombo, formatUtc, parseUtc } from '../time'
import { buttonSizes, buttonVariants } from './styles'

export function Icon({ name, className = '' }) {
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
      {name}
    </span>
  )
}

export function Spinner({ className = '' }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none ${className}`}
      aria-hidden="true"
    />
  )
}

/**
 * Button that shows a spinner and is disabled while `loading`,
 * which prevents double submits.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  loadingText,
  disabled,
  children,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} className="text-[18px]" /> : null}
      {loading && loadingText ? loadingText : children}
    </button>
  )
}

/** Time shown in Asia/Colombo, with the UTC value in the tooltip and for screen readers. */
export function DateTime({ value, fallback = '—', className = '' }) {
  const date = parseUtc(value)
  if (!date) return <span className={className}>{fallback}</span>
  const utc = formatUtc(date)

  return (
    <time dateTime={date.toISOString()} title={utc} className={className}>
      {formatColombo(date)}
      <span className="sr-only"> Sri Lanka time ({utc})</span>
    </time>
  )
}

/** Short, readable form of a 24-character reservation id. */
export function Reference({ id, className = '' }) {
  if (!id) return <span className={className}>—</span>
  return (
    <span className={`font-mono text-xs ${className}`} title={id}>
      <span aria-hidden="true">…{id.slice(-8).toUpperCase()}</span>
      <span className="sr-only">Reference {id}</span>
    </span>
  )
}

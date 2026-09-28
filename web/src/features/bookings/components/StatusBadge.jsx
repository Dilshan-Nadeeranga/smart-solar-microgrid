import { STATUS_META, toStatus } from '../status'
import { Icon } from './ui'

/** Status shown as colour + icon + text, so it never relies on colour alone. */
export default function StatusBadge({ status, className = '' }) {
  const key = toStatus(status)
  const meta = key ? STATUS_META[key] : null

  if (!meta) {
    return (
      <span className={`inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 ${className}`}>
        Unknown
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta.className} ${className}`}
    >
      <Icon name={meta.icon} className="text-[16px]" />
      {meta.label}
    </span>
  )
}

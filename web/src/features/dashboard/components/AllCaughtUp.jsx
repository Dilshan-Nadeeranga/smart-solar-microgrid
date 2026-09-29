import { CheckCircleIcon } from '../icons'

/** Replaces the attention cards when every count is zero. */
export default function AllCaughtUp() {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-2xl bg-(--dash-green-bg) px-5 py-4 text-sm font-semibold text-(--dash-green)"
    >
      <CheckCircleIcon className="h-5 w-5 shrink-0" strokeWidth={2} />
      All caught up — nothing needs your attention right now.
    </div>
  )
}

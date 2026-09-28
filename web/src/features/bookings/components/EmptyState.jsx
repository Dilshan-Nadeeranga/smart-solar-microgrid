import { Icon } from './ui'

export default function EmptyState({ icon = 'inbox', title, description, action, compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-center ${compact ? 'px-4 py-8' : 'px-6 py-14'}`}
      role="status"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-secondary">
        <Icon name={icon} className="text-[26px]" />
      </div>
      <div className="flex max-w-md flex-col gap-1">
        <p className="text-base font-semibold text-on-surface">{title}</p>
        {description && <p className="text-sm text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  )
}

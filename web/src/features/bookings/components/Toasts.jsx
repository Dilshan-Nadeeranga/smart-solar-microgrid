import { focusRing } from './styles'
import { Icon } from './ui'

const TONES = {
  success: { icon: 'check_circle', className: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
  info: { icon: 'info', className: 'border-blue-300 bg-blue-50 text-blue-900' },
  error: { icon: 'error', className: 'border-red-300 bg-red-50 text-red-900' },
}

/** Live region for action results. Errors are announced assertively. */
export default function Toasts({ toasts, onDismiss }) {
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 left-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:w-96"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => {
        const tone = TONES[toast.tone] ?? TONES.info
        return (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${tone.className}`}
          >
            <Icon name={tone.icon} className="mt-0.5 text-[20px]" />
            <p className="min-w-0 flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className={`-mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-black/5 ${focusRing}`}
            >
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

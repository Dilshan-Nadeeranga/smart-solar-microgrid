import { useId } from 'react'
import { useModalDialog } from './useModalDialog'
import { Button, Icon } from './ui'

const TONES = {
  danger: 'bg-red-100 text-red-800',
  caution: 'bg-amber-100 text-amber-900',
}

/**
 * Accessible confirm dialog (native modal <dialog>: focus trap, Esc to cancel).
 * Focus starts on Cancel so a destructive action is never one Enter away.
 */
export default function ConfirmDialog({
  open,
  title,
  children,
  icon = 'warning',
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  busyLabel = 'Working…',
  onConfirm,
  onCancel,
}) {
  const titleId = useId()
  const bodyId = useId()
  const dialogRef = useModalDialog(open, onCancel, { locked: busy })

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-surface-container-lowest p-0 text-on-surface shadow-xl backdrop:bg-black/50"
    >
      {open && (
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TONES[tone]}`}>
              <Icon name={icon} className="text-[22px]" />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <h2 id={titleId} className="text-lg font-bold">
                {title}
              </h2>
              <div id={bodyId} className="flex flex-col gap-2 text-sm text-secondary">
                {children}
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {/* First focusable element: showModal() puts focus here. */}
            <Button onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </Button>
            <Button variant={confirmVariant} onClick={onConfirm} loading={busy} loadingText={busyLabel}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  )
}

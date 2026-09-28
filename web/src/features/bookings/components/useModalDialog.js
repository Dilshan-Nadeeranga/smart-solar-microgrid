import { useEffect, useRef } from 'react'

/**
 * Drives a native <dialog> as a modal: showModal() makes the rest of the page
 * inert (focus is trapped) and Esc closes it. Focus returns to the element that
 * was focused before opening.
 *
 * @param {boolean} open
 * @param {() => void} onDismiss called for Esc / backdrop click unless `locked`
 * @param {{ locked?: boolean }} [options] locked = ignore dismiss (e.g. while saving)
 */
export function useModalDialog(open, onDismiss, { locked = false } = {}) {
  const dialogRef = useRef(null)
  const returnFocusRef = useRef(null)
  const dismissRef = useRef(onDismiss)
  const lockedRef = useRef(locked)

  useEffect(() => {
    dismissRef.current = onDismiss
    lockedRef.current = locked
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
      const target = returnFocusRef.current
      if (target && target.isConnected && typeof target.focus === 'function') target.focus()
      returnFocusRef.current = null
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined

    const onCancel = (event) => {
      event.preventDefault()
      if (!lockedRef.current) dismissRef.current()
    }
    const onClick = (event) => {
      // A click on the <dialog> element itself (not its content) is a backdrop click.
      if (event.target === dialog && !lockedRef.current) dismissRef.current()
    }

    dialog.addEventListener('cancel', onCancel)
    dialog.addEventListener('click', onClick)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      dialog.removeEventListener('click', onClick)
    }
  }, [])

  // Close without restoring focus if the component unmounts while open.
  useEffect(
    () => () => {
      if (dialogRef.current?.open) dialogRef.current.close()
    },
    [],
  )

  return dialogRef
}

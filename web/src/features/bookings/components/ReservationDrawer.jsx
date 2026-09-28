import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { bookingsApi } from '../bookingsApi'
import { queryKeys, useBookings, useStations } from '../context'
import { useQuery } from '../query'
import { STATUS } from '../status'
import { formatColomboRange, formatUtc } from '../time'
import ErrorState from './ErrorState'
import StatusBadge from './StatusBadge'
import StatusTimeline from './StatusTimeline'
import { focusRing, buttonSizes, buttonVariants } from './styles'
import { useModalDialog } from './useModalDialog'
import { Button, DateTime, Icon } from './ui'

// Member 3 owns these screens; Member 4 only links to them.
const member3Paths = {
  details: (id) => `/reservations/${encodeURIComponent(id)}`,
  edit: (id) => `/reservations/${encodeURIComponent(id)}/edit`,
}

function Field({ label, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-secondary">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-on-surface">{children}</dd>
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  if (!navigator.clipboard) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked; the id is still selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Reference copied' : 'Copy reference'}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-surface-container-low hover:text-on-surface ${focusRing}`}
    >
      <Icon name={copied ? 'check' : 'content_copy'} className="text-[16px]" />
    </button>
  )
}

function DrawerSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4 p-6">
      <span className="sr-only">Loading reservation…</span>
      {['w-24', 'w-full', 'w-3/4', 'w-full', 'w-2/3', 'w-1/2'].map((width, i) => (
        <div key={i} className={`h-4 animate-pulse rounded bg-surface-container-high motion-reduce:animate-none ${width}`} aria-hidden="true" />
      ))}
    </div>
  )
}

function DrawerBody({ reservationId }) {
  const { canApprove, pendingAction, approve, requestReject } = useBookings()
  const { nameById } = useStations()
  const query = useQuery(queryKeys.detail(reservationId), () => bookingsApi.get(reservationId))
  const reservation = query.data

  if (query.isLoading) return <DrawerSkeleton />
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={query.refetch} retrying={query.isFetching} title="Could not load reservation" />
  }

  const busy = pendingAction(reservation.id)
  const isPending = reservation.status === STATUS.Pending
  const isActive = isPending || reservation.status === STATUS.Approved
  const stationName = reservation.stationName || nameById.get(reservation.stationId)

  return (
    <div className="flex flex-col gap-6 p-6">
      {query.error && (
        <ErrorState variant="banner" error={query.error} onRetry={query.refetch} retrying={query.isFetching} />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={reservation.status} />
        {query.isFetching && (
          <span className="text-xs text-secondary" role="status">
            Refreshing…
          </span>
        )}
      </div>

      {isPending && canApprove && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-950">This reservation is waiting for approval.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="approve"
              icon="check"
              loading={busy === 'approve'}
              loadingText="Approving…"
              disabled={Boolean(busy)}
              onClick={() => approve(reservation)}
            >
              Approve
            </Button>
            <Button
              variant="reject"
              icon="close"
              loading={busy === 'reject'}
              loadingText="Rejecting…"
              disabled={Boolean(busy)}
              onClick={() => requestReject(reservation)}
            >
              Reject
            </Button>
          </div>
        </div>
      )}

      <section aria-labelledby="drawer-details-heading" className="flex flex-col gap-3">
        <h3 id="drawer-details-heading" className="text-sm font-bold text-on-surface">
          Details
        </h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Reference">
              <span className="flex items-center gap-1">
                <span className="break-all font-mono text-xs">{reservation.id}</span>
                <CopyButton text={reservation.id} />
              </span>
            </Field>
          </div>
          <Field label="Prosumer (NIC)">{reservation.prosumerId || '—'}</Field>
          <Field label="Station">{stationName || <span className="font-mono text-xs">{reservation.stationId}</span>}</Field>
          <div className="sm:col-span-2">
            <Field label="Slot (Sri Lanka time)">
              {reservation.slotStartTimeUtc ? (
                <span title={`${formatUtc(reservation.slotStartTimeUtc)} – ${formatUtc(reservation.slotEndTimeUtc)}`}>
                  {formatColomboRange(reservation.slotStartTimeUtc, reservation.slotEndTimeUtc)}
                </span>
              ) : (
                '—'
              )}
            </Field>
          </div>
          <Field label="Created">
            <DateTime value={reservation.createdAtUtc} />
          </Field>
          <Field label="Last updated">
            <DateTime value={reservation.updatedAtUtc} />
          </Field>
          {reservation.completedByOperatorId && (
            <Field label="Completed by operator">{reservation.completedByOperatorId}</Field>
          )}
        </dl>
      </section>

      <section aria-labelledby="drawer-timeline-heading" className="flex flex-col gap-3">
        <h3 id="drawer-timeline-heading" className="text-sm font-bold text-on-surface">
          Timeline
        </h3>
        <StatusTimeline reservation={reservation} />
      </section>

      <section aria-labelledby="drawer-m3-heading" className="flex flex-col gap-3 border-t border-outline-variant/30 pt-5">
        <h3 id="drawer-m3-heading" className="text-sm font-bold text-on-surface">
          Reservation management
        </h3>
        <p className="text-xs text-secondary">Details, changes and cancellation are handled on the Reservations screens.</p>
        <div className="flex flex-wrap gap-2">
          <Link to={member3Paths.details(reservation.id)} className={`${buttonVariants.secondary} ${buttonSizes.sm}`}>
            <Icon name="open_in_new" className="text-[16px]" />
            Open details
          </Link>
          {isActive && (
            <>
              <Link to={member3Paths.edit(reservation.id)} className={`${buttonVariants.secondary} ${buttonSizes.sm}`}>
                <Icon name="edit" className="text-[16px]" />
                Edit booking
              </Link>
              <Link to={member3Paths.details(reservation.id)} className={`${buttonVariants.secondary} ${buttonSizes.sm}`}>
                <Icon name="event_busy" className="text-[16px]" />
                Cancel booking
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

/** Side drawer for one reservation. Open while `reservationId` is set. */
export default function ReservationDrawer({ reservationId, onClose }) {
  const titleId = useId()
  const open = Boolean(reservationId)
  const dialogRef = useModalDialog(open, onClose)

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="fixed inset-y-0 right-0 left-auto m-0 h-full max-h-none w-full max-w-lg overflow-y-auto bg-surface-container-lowest p-0 text-on-surface shadow-2xl backdrop:bg-black/40 sm:rounded-l-2xl"
    >
      {open && (
        <>
          <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-outline-variant/30 bg-surface-container-lowest px-6 py-4">
            <div className="flex min-w-0 flex-col">
              <h2 id={titleId} className="text-lg font-bold">
                Reservation
              </h2>
              <p className="truncate font-mono text-xs text-secondary" title={reservationId}>
                …{reservationId.slice(-8).toUpperCase()}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close reservation details"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-secondary hover:bg-surface-container-low hover:text-on-surface ${focusRing}`}
            >
              <Icon name="close" />
            </button>
          </header>
          <DrawerBody key={reservationId} reservationId={reservationId} />
        </>
      )}
    </dialog>
  )
}

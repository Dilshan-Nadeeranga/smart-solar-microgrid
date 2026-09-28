import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import { bookingsApi } from '../bookingsApi'
import { queryKeys, useBookings, useNow, useProsumer, useSlot, useStation, useStations } from '../context'
import { useQuery } from '../query'
import { buildChecks } from '../review'
import { STATUS } from '../status'
import { formatColomboRange, formatUtc } from '../time'
import ErrorState from './ErrorState'
import StatusBadge from './StatusBadge'
import StatusTimeline from './StatusTimeline'
import { focusRing, buttonSizes, buttonVariants } from './styles'
import { useModalDialog } from './useModalDialog'
import { Button, DateTime, Icon, Spinner } from './ui'

// Member 3 owns these screens; Member 4 only links to them.
const member3Paths = {
  details: (id) => `/reservations/${encodeURIComponent(id)}`,
  edit: (id) => `/reservations/${encodeURIComponent(id)}/edit`,
}

// GET /users/{nic} is Backoffice-only in the API.
const PROSUMER_READER_ROLES = ['BACKOFFICE']

function Field({ label, children, wide = false }) {
  return (
    <div className={`flex min-w-0 flex-col gap-0.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-secondary">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-on-surface">{children}</dd>
    </div>
  )
}

function Section({ id, icon, title, children, aside }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id={id} className="flex items-center gap-2 text-sm font-bold text-on-surface">
          <Icon name={icon} className="text-[18px] text-secondary" />
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

function ActiveFlag({ active }) {
  if (active === undefined || active === null) return '—'
  return active ? (
    <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
      <Icon name="check_circle" className="text-[16px]" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-semibold text-red-800">
      <Icon name="block" className="text-[16px]" /> Inactive
    </span>
  )
}

/** Loading / error placeholder for one detail section. */
function SectionState({ query, what }) {
  if (query.isLoading) {
    return (
      <div role="status" className="flex items-center gap-2 text-sm text-secondary">
        <Spinner /> Loading {what}…
      </div>
    )
  }
  return <ErrorState variant="banner" error={query.error} onRetry={query.refetch} retrying={query.isFetching} />
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

const CHECK_STYLES = {
  pass: { icon: 'check_circle', className: 'text-emerald-700', label: 'Passed' },
  fail: { icon: 'cancel', className: 'text-red-700', label: 'Failed' },
  error: { icon: 'error', className: 'text-red-700', label: 'Could not check' },
  info: { icon: 'info', className: 'text-blue-700', label: 'Note' },
  loading: { icon: 'progress_activity', className: 'text-secondary', label: 'Checking' },
}

function ChecksList({ checks }) {
  return (
    <ul className="flex flex-col gap-2" aria-label="Verification checks">
      {checks.map((check) => {
        const style = CHECK_STYLES[check.state]
        return (
          <li key={check.key} className="flex items-start gap-2">
            {check.state === 'loading' ? (
              <Spinner className="mt-0.5 shrink-0 text-secondary" />
            ) : (
              <Icon name={style.icon} className={`mt-px shrink-0 text-[18px] ${style.className}`} />
            )}
            <div className="flex min-w-0 flex-col">
              <p className="text-sm font-semibold text-on-surface">
                <span className="sr-only">{style.label}: </span>
                {check.label}
              </p>
              {check.detail && <p className="text-xs text-secondary">{check.detail}</p>}
            </div>
          </li>
        )
      })}
    </ul>
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

/**
 * Sticky footer for a pending booking: Approve stays disabled until every
 * check has loaded, none blocks, and the reviewer ticks the confirmation.
 */
function ApprovalFooter({ reservation, review }) {
  const { pendingAction, approve, requestReject } = useBookings()
  const checkboxId = useId()
  const hintId = useId()
  // The tick belongs to the version that was reviewed; a refetch with a new version clears it.
  const [verifiedVersion, setVerifiedVersion] = useState(null)
  const verified = verifiedVersion !== null && verifiedVersion === reservation.version

  const busy = pendingAction(reservation.id)
  const canTick = !review.loading && !review.blocking
  const hint = review.loading
    ? 'Running checks…'
    : review.blocking
      ? 'Approval is blocked by a failed check. You can still reject this booking.'
      : verified
        ? null
        : 'Tick the box to confirm you reviewed the details.'

  return (
    <footer className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-outline-variant/30 bg-surface-container-lowest px-6 py-4 shadow-[0_-8px_16px_-12px_rgb(0_0_0/0.25)]">
      <div className="flex items-start gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={verified}
          disabled={!canTick || Boolean(busy)}
          onChange={(event) => setVerifiedVersion(event.target.checked ? reservation.version : null)}
          aria-describedby={hint ? hintId : undefined}
          className={`mt-0.5 h-5 w-5 shrink-0 accent-emerald-700 disabled:cursor-not-allowed ${focusRing}`}
        />
        <label htmlFor={checkboxId} className={`text-sm ${canTick ? 'text-on-surface' : 'text-secondary'}`}>
          I have verified the booking, slot, station and prosumer details.
        </label>
      </div>
      {hint && (
        <p id={hintId} className={`text-xs ${review.blocking ? 'font-semibold text-red-800' : 'text-secondary'}`} role="status">
          {hint}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="approve"
          icon="check"
          loading={busy === 'approve'}
          loadingText="Approving…"
          disabled={!verified || !canTick || Boolean(busy)}
          onClick={() => approve(reservation)}
        >
          Approve booking
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
    </footer>
  )
}

function DrawerBody({ reservationId }) {
  const { user } = useAuth()
  const { canApprove } = useBookings()
  const { nameById } = useStations()
  const now = useNow()
  const query = useQuery(queryKeys.detail(reservationId), () => bookingsApi.get(reservationId))
  const reservation = query.data

  const canReadProsumer = PROSUMER_READER_ROLES.includes(user?.role)
  const slotQuery = useSlot(reservation?.slotId)
  const stationQuery = useStation(reservation?.stationId)
  const prosumerQuery = useProsumer(reservation?.prosumerId, canReadProsumer)

  if (query.isLoading) return <DrawerSkeleton />
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={query.refetch} retrying={query.isFetching} title="Could not load reservation" />
  }

  const isPending = reservation.status === STATUS.Pending
  const isActive = isPending || reservation.status === STATUS.Approved
  const reviewing = isPending && canApprove
  const review = buildChecks({
    reservation,
    slotQuery,
    stationQuery,
    prosumerQuery: canReadProsumer ? prosumerQuery : null,
    now,
  })

  const slot = slotQuery.data
  const station = stationQuery.data
  const prosumer = prosumerQuery.data
  const slotStart = slot?.startTimeUtc ?? reservation.slotStartTimeUtc
  const slotEnd = slot?.endTimeUtc ?? reservation.slotEndTimeUtc

  return (
    <>
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

        {reviewing && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <Icon name="fact_check" className="text-[20px]" />
            <p>
              <span className="font-semibold">Review required.</span> Check the booking, slot, station and prosumer
              below, then confirm and approve at the bottom of this panel.
            </p>
          </div>
        )}

        <Section id="drawer-booking" icon="receipt_long" title="Booking">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Reference" wide>
              <span className="flex items-center gap-1">
                <span className="break-all font-mono text-xs">{reservation.id}</span>
                <CopyButton text={reservation.id} />
              </span>
            </Field>
            <Field label="Requested">
              <DateTime value={reservation.createdAtUtc} />
            </Field>
            <Field label="Last updated">
              <DateTime value={reservation.updatedAtUtc} />
            </Field>
            {reservation.completedByOperatorId && (
              <Field label="Completed by operator">{reservation.completedByOperatorId}</Field>
            )}
          </dl>
        </Section>

        <Section id="drawer-slot" icon="schedule" title="Slot">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Time (Sri Lanka)" wide>
              {slotStart ? (
                <span title={`${formatUtc(slotStart)} – ${formatUtc(slotEnd)}`}>{formatColomboRange(slotStart, slotEnd)}</span>
              ) : (
                '—'
              )}
            </Field>
            {slot && (
              <>
                <Field label="Capacity">
                  {slot.reservedBookings} of {slot.maximumBookings} booked
                  <span className="text-secondary"> · {slot.remainingBookings ?? Math.max(0, slot.maximumBookings - slot.reservedBookings)} left</span>
                </Field>
                <Field label="Slot status">
                  <ActiveFlag active={slot.isActive} />
                </Field>
              </>
            )}
          </dl>
          {!slot && <SectionState query={slotQuery} what="slot" />}
        </Section>

        <Section id="drawer-station" icon="solar_power" title="Station">
          {station ? (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name" wide>
                {station.name}
              </Field>
              <Field label="Address" wide>
                {station.address || '—'}
              </Field>
              <Field label="Capacity">{station.capacityKw != null ? `${station.capacityKw} kW` : '—'}</Field>
              <Field label="Battery storage slots">{station.batteryStorageSlots ?? '—'}</Field>
              <Field label="Station status">
                <ActiveFlag active={station.isActive} />
              </Field>
            </dl>
          ) : (
            <>
              <p className="text-sm text-on-surface">{reservation.stationName || nameById.get(reservation.stationId) || '—'}</p>
              <SectionState query={stationQuery} what="station" />
            </>
          )}
        </Section>

        <Section id="drawer-prosumer" icon="person" title="Prosumer">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="NIC">{reservation.prosumerId || '—'}</Field>
            {canReadProsumer && prosumer && (
              <>
                <Field label="Name">{prosumer.name || '—'}</Field>
                <Field label="Phone">{prosumer.phone || '—'}</Field>
                <Field label="Email">{prosumer.email || '—'}</Field>
                <Field label="Account status">
                  <span className="font-semibold">{String(prosumer.accountStatus ?? '—')}</span>
                </Field>
              </>
            )}
          </dl>
          {canReadProsumer && !prosumer && <SectionState query={prosumerQuery} what="prosumer" />}
          {!canReadProsumer && (
            <p className="text-xs text-secondary">Prosumer name and contact details are visible to Backoffice only.</p>
          )}
        </Section>

        {reviewing && (
          <Section id="drawer-checks" icon="fact_check" title="Verification checks">
            <ChecksList checks={review.checks} />
          </Section>
        )}

        <Section id="drawer-timeline" icon="timeline" title="Timeline">
          <StatusTimeline reservation={reservation} />
        </Section>

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

      {reviewing && <ApprovalFooter reservation={reservation} review={review} />}
    </>
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

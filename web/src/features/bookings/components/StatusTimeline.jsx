import { STATUS } from '../status'
import { DateTime, Icon } from './ui'

/**
 * created -> approved / rejected -> completed (with operator).
 * Cancelled (owned by Member 3) can follow Pending or Approved.
 */
function buildSteps(reservation) {
  const { status } = reservation
  const steps = [
    { key: 'created', icon: 'add_circle', title: 'Reservation created', at: reservation.createdAtUtc, state: 'done' },
  ]

  if (reservation.approvedAtUtc || status === STATUS.Approved || status === STATUS.Completed) {
    steps.push({ key: 'approved', icon: 'check_circle', title: 'Approved', at: reservation.approvedAtUtc, state: 'done' })
  } else if (reservation.rejectedAtUtc || status === STATUS.Rejected) {
    steps.push({
      key: 'rejected',
      icon: 'cancel',
      title: 'Rejected',
      detail: 'Slot capacity was released.',
      at: reservation.rejectedAtUtc,
      state: 'stopped',
    })
  } else if (status === STATUS.Pending) {
    steps.push({ key: 'review', icon: 'schedule', title: 'Awaiting approval', state: 'current' })
  }

  // TODO: show "Updated/Cancelled by staff (...)" once the reservation model and GET /api/reservations/{id} return staff-attribution fields.
  if (reservation.cancelledAtUtc || status === STATUS.Cancelled) {
    steps.push({ key: 'cancelled', icon: 'block', title: 'Cancelled', at: reservation.cancelledAtUtc, state: 'stopped' })
  } else if (reservation.completedAtUtc || status === STATUS.Completed) {
    steps.push({
      key: 'completed',
      icon: 'task_alt',
      title: 'Energy transfer completed',
      detail: reservation.completedByOperatorId ? `By operator ${reservation.completedByOperatorId}` : null,
      at: reservation.completedAtUtc,
      state: 'done',
    })
  } else if (status === STATUS.Approved || status === STATUS.Pending) {
    steps.push({
      key: 'transfer',
      icon: 'bolt',
      title: 'Energy transfer',
      detail: 'Completed by a Grid Operator after scanning the QR code.',
      state: 'upcoming',
    })
  }

  return steps
}

const STATE_STYLES = {
  done: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
  current: 'bg-amber-100 text-amber-900 ring-amber-300',
  stopped: 'bg-red-100 text-red-800 ring-red-300',
  upcoming: 'bg-surface-container text-secondary ring-outline-variant',
}

const STATE_LABEL = {
  done: 'Done',
  current: 'Current step',
  stopped: 'Ended',
  upcoming: 'Not yet',
}

export default function StatusTimeline({ reservation }) {
  const steps = buildSteps(reservation)

  return (
    <ol className="flex flex-col" aria-label="Status history">
      {steps.map((step, index) => {
        const last = index === steps.length - 1
        return (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0" aria-current={step.state === 'current' ? 'step' : undefined}>
            {!last && <span className="absolute left-4 top-9 bottom-1 w-px bg-outline-variant" aria-hidden="true" />}
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${STATE_STYLES[step.state]}`}>
              <Icon name={step.icon} className="text-[18px]" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5 pt-1">
              <p className={`text-sm font-semibold ${step.state === 'upcoming' ? 'text-secondary' : 'text-on-surface'}`}>
                {step.title}
                <span className="sr-only"> ({STATE_LABEL[step.state]})</span>
              </p>
              {step.at && <DateTime value={step.at} className="text-xs text-secondary" />}
              {step.detail && <p className="text-xs text-secondary">{step.detail}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

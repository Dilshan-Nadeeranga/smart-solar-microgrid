import { useBookings, useStations } from '../context'
import { STATUS } from '../status'
import { formatColombo, formatColomboTime, formatUtc, parseUtc } from '../time'
import DataTable from './DataTable'
import StatusBadge from './StatusBadge'
import { Button, DateTime, Reference } from './ui'

function Slot({ start, end }) {
  const startDate = parseUtc(start)
  if (!startDate) return <span className="text-secondary">—</span>
  const utc = `${formatUtc(start)} – ${formatUtc(end)}`
  return (
    <span className="flex flex-col" title={utc}>
      <span>{formatColombo(startDate)}</span>
      {end && <span className="text-xs text-secondary">until {formatColomboTime(end)}</span>}
      <span className="sr-only"> ({utc})</span>
    </span>
  )
}

/** Approve / Reject for one pending row (only for approver roles). */
export function RowActions({ reservation }) {
  const { canApprove, pendingAction, approve, requestReject } = useBookings()
  if (!canApprove || reservation.status !== STATUS.Pending) return null

  const busy = pendingAction(reservation.id)
  const ref = `…${reservation.id.slice(-8).toUpperCase()}`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="approve"
        size="sm"
        icon="check"
        loading={busy === 'approve'}
        loadingText="Approving…"
        disabled={Boolean(busy)}
        onClick={() => approve(reservation)}
        aria-label={`Approve reservation ${ref}`}
      >
        Approve
      </Button>
      <Button
        variant="reject"
        size="sm"
        icon="close"
        loading={busy === 'reject'}
        loadingText="Rejecting…"
        disabled={Boolean(busy)}
        onClick={() => requestReject(reservation)}
        aria-label={`Reject reservation ${ref}`}
      >
        Reject
      </Button>
    </div>
  )
}

/**
 * Reservation list for every Member 4 page.
 * showActions    — Approve / Reject column (pending lists)
 * showCompletion — CompletedAtUtc and CompletedByOperatorId columns (history)
 */
export default function ReservationTable({ caption, rows, showActions = false, showCompletion = false, busy = false }) {
  const { openReservation, canApprove } = useBookings()
  const { nameById } = useStations()

  const columns = [
    { key: 'reference', header: 'Reference', primary: true, cell: (row) => <Reference id={row.id} /> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'station',
      header: 'Station',
      cell: (row) => row.stationName || nameById.get(row.stationId) || <span className="text-secondary">Unknown station</span>,
    },
    { key: 'prosumer', header: 'Prosumer', cell: (row) => row.prosumerId || '—' },
    { key: 'slot', header: 'Slot (Sri Lanka)', cell: (row) => <Slot start={row.slotStartTimeUtc} end={row.slotEndTimeUtc} /> },
    { key: 'created', header: 'Created', cell: (row) => <DateTime value={row.createdAtUtc} /> },
  ]

  if (showCompletion) {
    columns.push(
      { key: 'completedAt', header: 'Completed at', cell: (row) => <DateTime value={row.completedAtUtc} /> },
      { key: 'completedBy', header: 'Completed by', cell: (row) => row.completedByOperatorId || '—' },
    )
  }

  if (showActions && canApprove) {
    columns.push({ key: 'actions', header: 'Actions', cell: (row) => <RowActions reservation={row} /> })
  }

  return (
    <DataTable
      caption={caption}
      columns={columns}
      rows={rows}
      busy={busy}
      onOpen={(row) => openReservation(row.id)}
      openLabel={(row) => `View reservation …${row.id.slice(-8).toUpperCase()}`}
    />
  )
}

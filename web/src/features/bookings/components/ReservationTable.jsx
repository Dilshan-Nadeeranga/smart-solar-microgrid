import { useBookings, useStations } from '../context'
import { STATUS } from '../status'
import { formatColombo, formatColomboTime, formatUtc, parseUtc } from '../time'
import DataTable from './DataTable'
import StatusBadge from './StatusBadge'
import { DateTime, Reference } from './ui'

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

/**
 * Reservation list for every Member 4 page.
 * showActions    — pending rows get a "Review" button that opens the review panel
 *                  (approval happens there, never straight from the table)
 * showCompletion — CompletedAtUtc and CompletedByOperatorId columns (history)
 */
export default function ReservationTable({ caption, rows, showActions = false, showCompletion = false, busy = false }) {
  const { openReservation, canApprove } = useBookings()
  const { nameById } = useStations()
  const needsReview = (row) => showActions && canApprove && row.status === STATUS.Pending

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

  return (
    <DataTable
      caption={caption}
      columns={columns}
      rows={rows}
      busy={busy}
      onOpen={(row) => openReservation(row.id)}
      openAction={(row) => (needsReview(row) ? { text: 'Review', emphasis: true } : { text: 'View', emphasis: false })}
      openLabel={(row) => `${needsReview(row) ? 'Review' : 'View'} reservation …${row.id.slice(-8).toUpperCase()}`}
    />
  )
}

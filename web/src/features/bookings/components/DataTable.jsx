import { focusRing } from './styles'
import { Icon } from './ui'

/**
 * Table on desktop (lg+), card list on tablet / mobile.
 *
 * columns: [{ key, header, cell(row), className?, primary?, hideOnCard? }]
 *   primary    — used as the card title
 *   hideOnCard — left out of the card body (e.g. shown in the title already)
 * onOpen(row, triggerElement) adds a "View" button per row; clicking the row opens it too.
 */
export default function DataTable({ caption, columns, rows, getRowKey = (row) => row.id, onOpen, openLabel, busy = false }) {
  const primary = columns.find((column) => column.primary) ?? columns[0]
  const cardColumns = columns.filter((column) => column !== primary && !column.hideOnCard)

  const openFromRow = (event, row) => {
    if (!onOpen || event.target.closest('button, a, input, select, label')) return
    onOpen(row, event.currentTarget.querySelector('[data-open-trigger]'))
  }

  const viewButton = (row) => (
    <button
      type="button"
      data-open-trigger
      onClick={(event) => onOpen(row, event.currentTarget)}
      aria-label={openLabel ? openLabel(row) : 'View details'}
      className={`inline-flex min-h-8 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-surface-container-low ${focusRing}`}
    >
      View
      <Icon name="chevron_right" className="text-[18px]" />
    </button>
  )

  return (
    <div aria-busy={busy || undefined} className={busy ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm text-on-surface">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface-container text-xs uppercase tracking-wide text-secondary">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={`px-4 py-3 font-semibold first:pl-6 ${column.className ?? ''}`}>
                  {column.header}
                </th>
              ))}
              {onOpen && (
                <th scope="col" className="px-4 py-3 pr-6 text-right font-semibold">
                  <span className="sr-only">Details</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={(event) => openFromRow(event, row)}
                className={`transition-colors hover:bg-surface-container-low ${onOpen ? 'cursor-pointer' : ''}`}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 align-middle first:pl-6 ${column.className ?? ''}`}>
                    {column.cell(row)}
                  </td>
                ))}
                {onOpen && <td className="px-4 py-3 pr-6 text-right">{viewButton(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 p-4 lg:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li
            key={getRowKey(row)}
            className="flex flex-col gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 font-semibold">{primary.cell(row)}</div>
              {onOpen && viewButton(row)}
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {cardColumns.map((column) => (
                <div key={column.key} className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-secondary">{column.header}</dt>
                  <dd className="min-w-0 text-sm text-on-surface">{column.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  )
}

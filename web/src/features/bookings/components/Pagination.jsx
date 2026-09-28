import { PAGE_SIZES } from '../bookingsApi'
import { inputClass } from './styles'
import { Button } from './ui'

export default function Pagination({ page, pageSize, totalCount, totalPages, onPageChange, onPageSizeChange }) {
  if (!totalCount) return null

  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, totalCount)
  const pages = Math.max(totalPages, 1)

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col gap-3 border-t border-outline-variant/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6"
    >
      <p className="text-sm text-secondary" aria-live="polite">
        Showing <span className="font-semibold text-on-surface">{first}–{last}</span> of{' '}
        <span className="font-semibold text-on-surface">{totalCount}</span>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-secondary">
          Rows per page
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className={`${inputClass} w-auto py-1`}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            icon="chevron_left"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            Prev
          </Button>
          <span className="text-sm text-on-surface">
            Page {page} of {pages}
          </span>
          <Button size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= pages} aria-label="Next page">
            Next
          </Button>
        </div>
      </div>
    </nav>
  )
}

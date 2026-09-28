import { useEffect, useId, useState } from 'react'
import StatusBadge from './StatusBadge'
import { STATUS_META } from '../status'
import { focusRing, inputClass } from './styles'
import { Icon } from './ui'

const SEARCH_DEBOUNCE_MS = 400
const SEARCH_MAX_LENGTH = 100

/** Text box that commits its value 400 ms after the user stops typing (or on Enter). */
function SearchField({ id, value, onCommit, placeholder }) {
  const [text, setText] = useState(value)
  const [synced, setSynced] = useState(value)

  // The committed value changed from outside (Clear all, back button): show it.
  if (value !== synced) {
    setSynced(value)
    if (text.trim() !== value) setText(value)
  }

  useEffect(() => {
    if (text.trim() === value) return undefined
    const timer = setTimeout(() => onCommit(text.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text, value, onCommit])

  return (
    <div className="relative">
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-secondary" />
      <input
        id={id}
        type="search"
        value={text}
        maxLength={SEARCH_MAX_LENGTH}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="false"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onCommit(text.trim())
        }}
        className={`${inputClass} pl-10`}
      />
    </div>
  )
}

/**
 * Filters for reservation lists. Every value comes from (and goes to) the URL,
 * so the parent owns the state.
 *
 * props:
 *   search        { value, onChange }
 *   station       { value, onChange, options: [{id, name}], loading, error }
 *   date          { value, onChange }                      (YYYY-MM-DD, UTC)
 *   status        { value, onChange, options, allLabel? }  (single select; omit to hide;
 *                                                          allLabel: null removes the "All" chip)
 *   applied       [{ key, label, onRemove }]
 *   onClearAll
 */
export default function FilterBar({ search, station, date, status, applied = [], onClearAll }) {
  const ids = useId()

  return (
    <section aria-label="Filters" className="flex flex-col gap-4 border-b border-outline-variant/20 p-4 lg:px-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-search`} className="text-xs font-semibold text-secondary">
            Reference or station name
          </label>
          <SearchField
            id={`${ids}-search`}
            value={search.value}
            onCommit={search.onChange}
            placeholder="Full reservation id or station name"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-station`} className="text-xs font-semibold text-secondary">
            Station
          </label>
          <select
            id={`${ids}-station`}
            value={station.value}
            onChange={(event) => station.onChange(event.target.value)}
            className={inputClass}
            aria-describedby={station.error ? `${ids}-station-error` : undefined}
          >
            <option value="">{station.loading ? 'Loading stations…' : 'All stations'}</option>
            {station.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
                {option.isActive === false ? ' (inactive)' : ''}
              </option>
            ))}
            {station.value && !station.options.some((option) => option.id === station.value) && (
              <option value={station.value}>Selected station</option>
            )}
          </select>
          {station.error && (
            <p id={`${ids}-station-error`} className="text-xs text-red-800">
              Stations could not be loaded.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-date`} className="text-xs font-semibold text-secondary">
            Slot date <span className="font-normal">(UTC)</span>
          </label>
          <input
            id={`${ids}-date`}
            type="date"
            value={date.value}
            onChange={(event) => date.onChange(event.target.value)}
            className={inputClass}
            aria-describedby={`${ids}-date-hint`}
          />
          <p id={`${ids}-date-hint`} className="sr-only">
            Filters by the slot start date in UTC. Sri Lanka time is UTC plus 5 hours 30 minutes.
          </p>
        </div>
      </div>

      {status && (
        <div role="group" aria-label="Status" className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold text-secondary" aria-hidden="true">
            Status
          </span>
          {[
            ...(status.allLabel === null ? [] : [{ value: '', label: status.allLabel ?? 'All' }]),
            ...status.options.map((value) => ({ value, label: STATUS_META[value].label })),
          ].map(
            (option) => {
              const selected = status.value === option.value
              return (
                <button
                  key={option.value || 'all'}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => status.onChange(option.value)}
                  className={`rounded-full transition-shadow ${focusRing} ${
                    selected ? 'ring-2 ring-on-surface ring-offset-2' : 'hover:ring-1 hover:ring-outline-variant hover:ring-offset-1'
                  }`}
                >
                  {option.value ? (
                    <StatusBadge status={option.value} />
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface">
                      <Icon name="filter_list" className="text-[16px]" />
                      {option.label}
                    </span>
                  )}
                </button>
              )
            },
          )}
        </div>
      )}

      {applied.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Applied filters" role="group">
          <span className="text-xs font-semibold text-secondary">Applied:</span>
          {applied.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-low py-0.5 pl-3 pr-1 text-xs text-on-surface"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remove filter ${chip.label}`}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-secondary hover:bg-surface-container-high hover:text-on-surface ${focusRing}`}
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className={`rounded-lg px-2 py-1 text-xs font-semibold text-primary underline-offset-2 hover:underline ${focusRing}`}
          >
            Clear all
          </button>
        </div>
      )}
    </section>
  )
}

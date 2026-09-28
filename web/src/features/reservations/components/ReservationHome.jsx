import { useEffect, useState } from 'react';
import { reservationsApi } from '../../../api.js';
import { formatDate, formatTimeRange, initials } from '../format';
import { ErrorNotice, Icon, Notice, PageHeader, Spinner, StatusBadge, StepHeader } from './ui';

function bookingLabel(item, refData) {
  const name = refData.prosumerByNic.get(item.prosumerId)?.name ?? item.prosumerId;
  const stationName = item.stationName ?? refData.stationById.get(item.stationId)?.name ?? item.stationId;
  const when = item.slotStartTimeUtc
    ? `${formatDate(item.slotStartTimeUtc)} · ${formatTimeRange(item.slotStartTimeUtc, item.slotEndTimeUtc)}`
    : 'Slot time unavailable';

  return { name, stationName, when };
}

function RejectDialog({ booking, onKeep, onConfirmed }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);

    try {
      const summary = await reservationsApi.reject(booking.id, { version: booking.version });
      onConfirmed(summary);
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <div className="rm-dialog-backdrop" role="presentation">
      <div className="rm-dialog" role="dialog" aria-modal="true" aria-labelledby="rm-reject-title">
        <span className="rm-dialog__icon">
          <Icon name="cancel" />
        </span>
        <h2 id="rm-reject-title">Reject this booking?</h2>
        <p className="rm-muted">
          {booking.stationName} · {booking.when}
        </p>
        <ul className="rm-bullets">
          <li>The booking status changes to Rejected.</li>
          <li>Its space in the slot is released.</li>
          <li>The prosumer is not given this energy slot.</li>
        </ul>
        <ErrorNotice error={error} />
        <div className="rm-dialog__actions">
          <button type="button" className="rm-button rm-button--ghost" onClick={onKeep} disabled={submitting}>
            Keep pending
          </button>
          <button type="button" className="rm-button rm-button--danger" onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Rejecting…' : 'Reject booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUSES = ['Pending', 'Approved', 'Cancelled', 'Rejected', 'Completed'];

export default function ReservationHome({ refData, onCreate, onOpen, view = 'all' }) {
  const [reference, setReference] = useState('');
  const [lookupError, setLookupError] = useState(null);
  const [looking, setLooking] = useState(false);
  const [bookings, setBookings] = useState(null);
  const [listError, setListError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [decisionError, setDecisionError] = useState(null);
  const [decisionMessage, setDecisionMessage] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stationFilter, setStationFilter] = useState('');

  useEffect(() => {
    let active = true;

    reservationsApi
      .list()
      .then((page) => {
        if (active) setBookings(page?.items ?? []);
      })
      .catch((error) => {
        if (!active) return;
        setListError(error);
        setBookings([]);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  async function handleApprove(item) {
    setBusyId(item.id);
    setDecisionError(null);
    setDecisionMessage(null);

    try {
      const summary = await reservationsApi.approve(item.id, { version: item.version });
      setDecisionMessage(summary.message || 'Reservation approved.');
      setReloadKey((value) => value + 1);
    } catch (error) {
      setDecisionError(error);
    } finally {
      setBusyId(null);
    }
  }

  async function handleLookup(event) {
    event.preventDefault();

    const id = reference.trim();
    if (!id) return;

    setLooking(true);
    setLookupError(null);

    try {
      await reservationsApi.get(id);
      onOpen(id);
    } catch (error) {
      setLookupError(error);
      setLooking(false);
    }
  }

  const pendingBookings = (bookings ?? []).filter((item) => item.status === 'Pending');
  const showPending = view === 'pending';
  const searchText = query.trim().toLowerCase();
  const filtersActive = Boolean(searchText || statusFilter || stationFilter);
  const visibleBookings = (bookings ?? []).filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (stationFilter && item.stationId !== stationFilter) return false;
    if (!searchText) return true;

    const label = bookingLabel(item, refData);
    return [label.name, item.prosumerId, label.stationName, item.id, label.when]
      .join(' ')
      .toLowerCase()
      .includes(searchText);
  });

  return (
    <div className="rm-page">
      <PageHeader
        eyebrow="Reservation management"
        title={view === 'pending' ? 'Pending reservations' : 'All reservations'}
        description={
          view === 'pending'
            ? 'Bookings requested from the prosumer app. Approve a booking or reject it and release the slot.'
            : 'Every booking, including ones you created and ones waiting for approval. Bookings you create are approved immediately.'
        }
      />

      {view === 'all' && (
        <div className="rm-home-grid">
          <section className="rm-card rm-card--feature">
            <span className="rm-feature-icon">
              <Icon name="bolt" />
            </span>
            <h2>New booking</h2>
            <p className="rm-muted">
              Book an energy slot for a prosumer at an active station within the next seven days.
            </p>
            <button type="button" className="rm-button rm-button--primary" onClick={onCreate}>
              <Icon name="add" />
              Create booking
            </button>
          </section>

          <section className="rm-card">
            <span className="rm-feature-icon rm-feature-icon--soft">
              <Icon name="search" />
            </span>
            <h2>Find a reservation</h2>
            <p className="rm-muted">Open a booking by its reference to view, change or cancel it.</p>
            <form className="rm-input-row" onSubmit={handleLookup}>
              <label className="rm-visually-hidden" htmlFor="rm-reference">
                Reservation reference
              </label>
              <div className="rm-input-icon">
                <Icon name="confirmation_number" />
                <input
                  id="rm-reference"
                  className="rm-input rm-input--mono"
                  placeholder="e.g. 6710a1f28a1b2c3d4e5f6b01"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                />
              </div>
              <button type="submit" className="rm-button rm-button--soft" disabled={!reference.trim() || looking}>
                {looking ? 'Opening…' : 'Open'}
              </button>
            </form>
            <ErrorNotice error={lookupError} />
          </section>
        </div>
      )}

      {view === 'pending' && listError && <ErrorNotice error={listError} />}
      {view === 'pending' && (bookings === null || !refData.ready) && !listError && <Spinner />}

      {bookings !== null && refData.ready && showPending && (
        <section className="rm-card">
          <StepHeader
            title="Pending approvals"
            aside={<span className="rm-chip">{pendingBookings.length} waiting</span>}
          />
          <p className="rm-muted">
            These were requested from the prosumer app. Approve the booking or reject it and release the slot.
          </p>
          {decisionMessage && (
            <Notice tone="success" title="Updated">
              {decisionMessage}
            </Notice>
          )}
          <ErrorNotice error={decisionError} />
          {pendingBookings.length === 0 ? (
            <p className="rm-empty">No reservations are waiting for approval.</p>
          ) : (
          <ul className="rm-sample-list">
            {pendingBookings.map((item) => {
                const label = bookingLabel(item, refData);
                const busy = busyId === item.id;

                return (
                  <li key={item.id} className="rm-pending">
                    <button type="button" className="rm-sample" onClick={() => onOpen(item.id)}>
                      <span className="rm-sample__who">
                        <span className="rm-avatar rm-avatar--sm">{initials(label.name)}</span>
                        <span className="rm-value-stack">
                          <span className="rm-sample__name">{label.name}</span>
                          <span className="rm-value-stack__sub rm-mono">{item.id}</span>
                        </span>
                      </span>
                      <span className="rm-value-stack">
                        <span>{label.stationName}</span>
                        <span className="rm-value-stack__sub">{label.when}</span>
                      </span>
                      <StatusBadge status={item.status} label="Pending approval" />
                    </button>
                    <div className="rm-pending__actions">
                      <button
                        type="button"
                        className="rm-button rm-button--primary rm-button--sm"
                        disabled={busy}
                        onClick={() => handleApprove(item)}
                      >
                        <Icon name="check" />
                        {busy ? 'Approving…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        className="rm-button rm-button--danger-outline rm-button--sm"
                        disabled={busy}
                        onClick={() => setRejectTarget({ ...item, ...label })}
                      >
                        <Icon name="close" />
                        Reject
                      </button>
                    </div>
                  </li>
                );
              })}
          </ul>
          )}
        </section>
      )}

      {view === 'all' && (
        <section className="rm-card">
          <StepHeader
            title="Reservations"
            aside={
              bookings && refData.ready ? (
                <span className="rm-chip">
                  {visibleBookings.length} of {bookings.length}
                </span>
              ) : null
            }
          />

          <div className="rm-filters">
            <label className="rm-input-icon">
              <span className="rm-visually-hidden">Search reservations</span>
              <Icon name="search" />
              <input
                className="rm-input"
                placeholder="Search name, NIC, station or reference"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label>
              <span className="rm-visually-hidden">Status</span>
              <select
                className="rm-input"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">All statuses</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="rm-visually-hidden">Station</span>
              <select
                className="rm-input"
                value={stationFilter}
                onChange={(event) => setStationFilter(event.target.value)}
              >
                <option value="">All stations</option>
                {(refData.stations ?? []).map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {filtersActive && (
            <button
              type="button"
              className="rm-text-button"
              onClick={() => {
                setQuery('');
                setStatusFilter('');
                setStationFilter('');
              }}
            >
              Clear search and filters
            </button>
          )}

          {listError && <ErrorNotice error={listError} />}
          {bookings === null || !refData.ready ? (
            <Spinner />
          ) : bookings.length === 0 ? (
            <p className="rm-empty">No reservations yet.</p>
          ) : visibleBookings.length === 0 ? (
            <p className="rm-empty">No reservations match this search.</p>
          ) : (
            <ul className="rm-sample-list">
              {visibleBookings.map((item) => {
                const label = bookingLabel(item, refData);

                return (
                  <li key={item.id}>
                    <button type="button" className="rm-sample" onClick={() => onOpen(item.id)}>
                      <span className="rm-sample__who">
                        <span className="rm-avatar rm-avatar--sm">{initials(label.name)}</span>
                        <span className="rm-value-stack">
                          <span className="rm-sample__name">{label.name}</span>
                          <span className="rm-value-stack__sub rm-mono">{item.id}</span>
                        </span>
                      </span>
                      <span className="rm-value-stack">
                        <span>{label.stationName}</span>
                        <span className="rm-value-stack__sub">{label.when}</span>
                      </span>
                      <StatusBadge status={item.status} />
                      <Icon name="chevron_right" className="rm-sample__chevron" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {rejectTarget && (
        <RejectDialog
          booking={rejectTarget}
          onKeep={() => setRejectTarget(null)}
          onConfirmed={(summary) => {
            setRejectTarget(null);
            setDecisionError(null);
            setDecisionMessage(summary.message || 'Reservation rejected.');
            setReloadKey((value) => value + 1);
          }}
        />
      )}
    </div>
  );
}

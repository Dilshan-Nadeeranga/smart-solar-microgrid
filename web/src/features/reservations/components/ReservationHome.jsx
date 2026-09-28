import { useEffect, useState } from 'react';
import { reservationsApi } from '../../../api.js';
import { formatDate, formatTimeRange, initials } from '../format';
import { ErrorNotice, Icon, PageHeader, Spinner, StatusBadge, StepHeader } from './ui';

export default function ReservationHome({ refData, onCreate, onOpen }) {
  const [reference, setReference] = useState('');
  const [lookupError, setLookupError] = useState(null);
  const [looking, setLooking] = useState(false);
  const [bookings, setBookings] = useState(null);
  const [listError, setListError] = useState(null);

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
  }, []);

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

  return (
    <div className="rm-page">
      <PageHeader
        eyebrow="Reservation management"
        title="Energy-slot bookings"
        description="Create, change and cancel bookings on behalf of prosumers. Every change follows the same rules as the Android app."
      />

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

      <section className="rm-card">
        <StepHeader title="Reservations" />

        {listError && <ErrorNotice error={listError} />}
        {bookings === null || !refData.ready ? (
          <Spinner />
        ) : bookings.length === 0 ? (
          <p className="rm-empty">No reservations yet.</p>
        ) : (
          <ul className="rm-sample-list">
            {bookings.map((item) => {
              const name = refData.prosumerByNic.get(item.prosumerId)?.name ?? item.prosumerId;
              const stationName = item.stationName ?? refData.stationById.get(item.stationId)?.name ?? item.stationId;

              return (
                <li key={item.id}>
                  <button type="button" className="rm-sample" onClick={() => onOpen(item.id)}>
                    <span className="rm-sample__who">
                      <span className="rm-avatar rm-avatar--sm">{initials(name)}</span>
                      <span className="rm-value-stack">
                        <span className="rm-sample__name">{name}</span>
                        <span className="rm-value-stack__sub rm-mono">{item.id}</span>
                      </span>
                    </span>
                    <span className="rm-value-stack">
                      <span>{stationName}</span>
                      <span className="rm-value-stack__sub">
                        {item.slotStartTimeUtc
                          ? `${formatDate(item.slotStartTimeUtc)} · ${formatTimeRange(item.slotStartTimeUtc, item.slotEndTimeUtc)}`
                          : 'Slot time unavailable'}
                      </span>
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
    </div>
  );
}

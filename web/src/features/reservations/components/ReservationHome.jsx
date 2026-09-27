import { useEffect, useState } from 'react';
import { formatDate, formatTimeRange, initials } from '../format';
import { getReservation, listSampleReservations } from '../mockReservationApi';
import { ErrorNotice, Icon, PageHeader, Spinner, StatusBadge, StepHeader } from './ui';

export default function ReservationHome({ refData, refreshKey, onCreate, onOpen, onResetDemo }) {
  const [reference, setReference] = useState('');
  const [lookupError, setLookupError] = useState(null);
  const [looking, setLooking] = useState(false);
  const [samples, setSamples] = useState({ key: null, items: [] });

  useEffect(() => {
    let active = true;

    listSampleReservations().then((items) => {
      if (active) setSamples({ key: refreshKey, items });
    });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  async function handleLookup(event) {
    event.preventDefault();

    const id = reference.trim();
    if (!id) return;

    setLooking(true);
    setLookupError(null);

    try {
      await getReservation(id);
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
        <StepHeader
          title="Sample reservations"
          aside={
            <button type="button" className="rm-button rm-button--ghost rm-button--sm" onClick={onResetDemo}>
              <Icon name="restart_alt" />
              Reset demo data
            </button>
          }
        />
        <p className="rm-muted rm-section-note">
          Mock data for trying the screens. The full booking list is part of the monitoring pages
          (Member 4).
        </p>

        {samples.key !== refreshKey || !refData.ready ? (
          <Spinner />
        ) : (
          <ul className="rm-sample-list">
            {samples.items.map((item) => {
              const name = refData.prosumerByNic.get(item.prosumerId)?.name ?? item.prosumerId;

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
                      <span>{refData.stationById.get(item.stationId)?.name}</span>
                      <span className="rm-value-stack__sub">
                        {formatDate(item.slotStartTimeUtc)} ·{' '}
                        {formatTimeRange(item.slotStartTimeUtc, item.slotEndTimeUtc)}
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

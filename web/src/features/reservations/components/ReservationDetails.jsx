import { useState } from 'react';
import { formatDateTime, formatDuration, formatLongDate, formatTimeRange } from '../format';
import { useNow, useReservation } from '../hooks';
import { reservationsApi } from '../../../api.js';
import { modificationWindow } from '../reservationRules';
import {
  DetailList,
  ErrorNotice,
  HeaderStat,
  Icon,
  Notice,
  PageHeader,
  PanelHeader,
  ProsumerLabel,
  Reference,
  Spinner,
  StatusBadge,
  StepHeader,
  ValueStack,
} from './ui';

function CancelDialog({ reservation, stationName, onKeep, onConfirmed }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);

    try {
      const summary = await reservationsApi.cancel(reservation.id, { version: reservation.version });
      onConfirmed(summary);
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <div className="rm-dialog-backdrop" role="presentation">
      <div className="rm-dialog" role="dialog" aria-modal="true" aria-labelledby="rm-cancel-title">
        <span className="rm-dialog__icon">
          <Icon name="event_busy" />
        </span>
        <h2 id="rm-cancel-title">Cancel this booking?</h2>
        <p className="rm-muted">
          {stationName} · {formatLongDate(reservation.slotStartTimeUtc)},{' '}
          {formatTimeRange(reservation.slotStartTimeUtc, reservation.slotEndTimeUtc)}
        </p>
        <ul className="rm-bullets">
          <li>The booking status changes to Cancelled.</li>
          <li>Its space in the slot is released for other prosumers.</li>
          <li>The record is kept in the booking history.</li>
        </ul>

        <ErrorNotice error={error} />

        <div className="rm-dialog__actions">
          <button type="button" className="rm-button rm-button--ghost" onClick={onKeep} disabled={submitting}>
            Keep booking
          </button>
          <button
            type="button"
            className="rm-button rm-button--danger"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? 'Cancelling…' : 'Cancel booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReservationDetails({ reservationId, refData, onBack, onEdit, onCancelled }) {
  const now = useNow();
  const [confirming, setConfirming] = useState(false);
  const { summary, error, loading } = useReservation(reservationId);

  if (loading || error) {
    return (
      <div className="rm-page">
        <PageHeader onBack={onBack} backLabel="Reservations" eyebrow="Details" title="Reservation details" />
        {loading ? <Spinner /> : <ErrorNotice error={error} />}
      </div>
    );
  }

  const reservation = summary.reservation;
  const station = refData.stationById.get(reservation.stationId);
  const prosumer = refData.prosumerByNic.get(reservation.prosumerId);
  const changeWindow = modificationWindow(reservation, now);
  const untilStart = new Date(reservation.slotStartTimeUtc).getTime() - now;

  return (
    <div className="rm-page">
      <PageHeader
        onBack={onBack}
        backLabel="Reservations"
        eyebrow="Details"
        title={station?.name ?? 'Reservation'}
        description={`${formatLongDate(reservation.slotStartTimeUtc)} · ${formatTimeRange(
          reservation.slotStartTimeUtc,
          reservation.slotEndTimeUtc,
        )}`}
        aside={
          <HeaderStat
            icon="timer"
            label="Starts in"
            value={untilStart > 0 ? formatDuration(untilStart) : 'Already started'}
          />
        }
      />

      <div className="rm-layout">
        <div className="rm-layout__main">
          <section className="rm-card">
            <StepHeader title="Booking" aside={<StatusBadge status={reservation.status} />} />
            <DetailList
              items={[
                ['Reference', <Reference key="ref" id={reservation.id} />],
                ['Prosumer', <ProsumerLabel key="p" nic={reservation.prosumerId} prosumer={prosumer} />],
                [
                  'Station',
                  <ValueStack key="s" main={station?.name ?? reservation.stationId} sub={station?.address} />,
                ],
                ['Date', formatLongDate(reservation.slotStartTimeUtc)],
                ['Time', formatTimeRange(reservation.slotStartTimeUtc, reservation.slotEndTimeUtc)],
                ['Created', formatDateTime(reservation.createdAtUtc)],
                ['Last updated', formatDateTime(reservation.updatedAtUtc)],
                ...(reservation.cancelledAtUtc
                  ? [['Cancelled', formatDateTime(reservation.cancelledAtUtc)]]
                  : []),
                ['Version', reservation.version],
              ]}
            />
          </section>
        </div>

        <aside className="rm-layout__side">
          <div className="rm-panel">
            <PanelHeader eyebrow="Manage" title="Actions" icon="tune" />

            {changeWindow.allowed ? (
              <Notice tone="info" title="Changes allowed">
                Can be changed or cancelled until {formatDateTime(changeWindow.deadline)} (
                {formatDuration(changeWindow.deadline - now)} from now).
              </Notice>
            ) : (
              <Notice tone="warning" title="Changes closed">
                {changeWindow.reason}
                {changeWindow.deadline && ` The deadline was ${formatDateTime(changeWindow.deadline)}.`}
              </Notice>
            )}

            {reservation.status === 'Approved' && changeWindow.allowed && (
              <p className="rm-panel__policy">
                Changing an approved booking returns it to Pending and it needs approval again.
              </p>
            )}

            <button
              type="button"
              className="rm-button rm-button--primary rm-button--block rm-button--lg"
              disabled={!changeWindow.allowed}
              onClick={() => onEdit(reservation.id)}
            >
              <Icon name="edit_calendar" />
              Change slot
            </button>
            <button
              type="button"
              className="rm-button rm-button--danger-outline rm-button--block"
              disabled={!changeWindow.allowed}
              onClick={() => setConfirming(true)}
            >
              <Icon name="event_busy" />
              Cancel booking
            </button>
          </div>
        </aside>
      </div>

      {confirming && (
        <CancelDialog
          reservation={reservation}
          stationName={station?.name ?? 'Station'}
          onKeep={() => setConfirming(false)}
          onConfirmed={(result) => onCancelled(result, summary)}
        />
      )}
    </div>
  );
}

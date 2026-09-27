import { useState } from 'react';
import { formatDateTime, formatLongDate, formatMonth, formatTimeRange, initials } from '../format';
import { useNow, useStationSlots } from '../hooks';
import { createReservation, getProsumer } from '../mockReservationApi';
import { SEVEN_DAYS_MS } from '../reservationRules';
import SlotPicker from './SlotPicker';
import StationPicker from './StationPicker';
import {
  DetailList,
  ErrorNotice,
  HeaderStat,
  Icon,
  Notice,
  PageHeader,
  PanelHeader,
  Spinner,
  StatusBadge,
  StepHeader,
  ValueStack,
} from './ui';

const IDLE = { status: 'idle', prosumer: null, error: null };

export default function CreateBooking({ refData, onBack, onCreated }) {
  const now = useNow();
  const [nicInput, setNicInput] = useState('');
  const [verification, setVerification] = useState(IDLE);
  const [stationId, setStationId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [slotRefresh, setSlotRefresh] = useState(0);

  const { slots, loading: slotsLoading } = useStationSlots(stationId, slotRefresh);

  const prosumer = verification.prosumer;
  const prosumerActive = prosumer?.accountStatus === 'ACTIVE';
  const station = refData.stationById.get(stationId);
  const slot = slots.find((item) => item.id === slotId);
  const remaining = slot ? slot.maximumBookings - slot.reservedBookings : null;
  const activeStations = refData.stations.filter((item) => item.isActive).length;

  const canSubmit = prosumerActive && station && slot && !submitting;

  function handleNicChange(value) {
    setNicInput(value);
    if (verification.status !== 'idle') setVerification(IDLE);
  }

  async function handleVerify() {
    const nic = nicInput.trim();
    if (!nic) return;

    setVerification({ status: 'checking', prosumer: null, error: null });

    try {
      setVerification({ status: 'done', prosumer: await getProsumer(nic), error: null });
    } catch (err) {
      setVerification({ status: 'error', prosumer: null, error: err });
    }
  }

  function handleStationChange(id) {
    setStationId(id);
    setSlotId('');
    setError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const summary = await createReservation({ prosumerId: prosumer.nic, stationId, slotId });
      onCreated(summary);
    } catch (err) {
      setError(err);
      setSubmitting(false);

      if (err.status === 409) {
        setSlotId('');
        setSlotRefresh((value) => value + 1);
      }
    }
  }

  return (
    <form className="rm-page" onSubmit={handleSubmit}>
      <PageHeader
        onBack={onBack}
        backLabel="Reservations"
        eyebrow="New booking"
        title="Book an energy slot"
        description={
          <>
            Booking on behalf of a prosumer. The reservation is saved as <strong>Pending</strong>{' '}
            until a Backoffice user approves it.
          </>
        }
        aside={
          <HeaderStat
            icon="event_available"
            label="Booking window"
            value={`Until ${formatDateTime(now + SEVEN_DAYS_MS)}`}
          />
        }
      />

      <div className="rm-layout">
        <div className="rm-layout__main">
          <section className="rm-card">
            <StepHeader
              number={1}
              title="Prosumer"
              aside={
                <span className="rm-chip">
                  <Icon name="verified_user" />
                  Active accounts only
                </span>
              }
            />

            <div className="rm-field">
              <label className="rm-field__label" htmlFor="rm-nic">
                Prosumer NIC <span className="rm-text-danger">*</span>
              </label>
              <div className="rm-input-row">
                <div className="rm-input-icon">
                  <Icon name="badge" />
                  <input
                    id="rm-nic"
                    className="rm-input"
                    list="rm-prosumer-options"
                    placeholder="e.g. 200012345678"
                    value={nicInput}
                    autoComplete="off"
                    onChange={(event) => handleNicChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleVerify();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="rm-button rm-button--soft"
                  onClick={handleVerify}
                  disabled={!nicInput.trim() || verification.status === 'checking'}
                >
                  <Icon name="search" />
                  {verification.status === 'checking' ? 'Verifying…' : 'Verify prosumer'}
                </button>
              </div>
              <datalist id="rm-prosumer-options">
                {refData.prosumers.map((item) => (
                  <option key={item.nic} value={item.nic}>
                    {item.name}
                  </option>
                ))}
              </datalist>
            </div>

            <ErrorNotice error={verification.error} />

            {prosumer && (
              <div className="rm-prosumer">
                <div className="rm-prosumer__identity">
                  <span className="rm-avatar">{initials(prosumer.name)}</span>
                  <div>
                    <div className="rm-prosumer__name">
                      <h4>{prosumer.name}</h4>
                      <StatusBadge
                        status={prosumerActive ? 'Approved' : 'Rejected'}
                        label={prosumerActive ? 'Active' : 'Deactivated'}
                      />
                    </div>
                    <p className="rm-muted">
                      NIC {prosumer.nic} · {prosumer.address}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="rm-text-button"
                  onClick={() => {
                    handleNicChange('');
                    document.getElementById('rm-nic')?.focus();
                  }}
                >
                  Change
                </button>
              </div>
            )}

            {prosumer && !prosumerActive && (
              <Notice tone="warning" title="Account not active">
                Only active prosumer accounts can make reservations.
              </Notice>
            )}
          </section>

          <section className="rm-card">
            <StepHeader
              number={2}
              title="Select station"
              aside={<span className="rm-muted">{activeStations} active stations</span>}
            />
            {refData.ready ? (
              <StationPicker
                stations={refData.stations}
                selectedId={stationId}
                onSelect={handleStationChange}
              />
            ) : (
              <Spinner />
            )}
          </section>

          <section className="rm-card">
            <StepHeader
              number={3}
              title="Date & energy slot"
              aside={
                <span className="rm-muted rm-inline-icon">
                  <Icon name="calendar_month" />
                  {formatMonth(now)}
                </span>
              }
            />
            {!station && <p className="rm-empty">Choose a station to see its energy slots.</p>}
            {station && slotsLoading && <Spinner label="Loading slots…" />}
            {station && !slotsLoading && (
              <SlotPicker
                key={stationId}
                station={station}
                slots={slots}
                selectedSlotId={slotId}
                onSelect={(item) => {
                  setSlotId(item.id);
                  setError(null);
                }}
              />
            )}
          </section>
        </div>

        <aside className="rm-layout__side">
          <div className="rm-panel">
            <PanelHeader eyebrow="New reservation" title="Booking summary" icon="receipt_long" />

            <DetailList
              variant="summary"
              items={[
                [
                  'Prosumer',
                  prosumer ? <ValueStack main={prosumer.name} sub={`NIC ${prosumer.nic}`} /> : '—',
                ],
                [
                  'Station',
                  station ? <ValueStack main={station.name} sub={station.address} /> : '—',
                ],
                ['Date', slot ? formatLongDate(slot.startTimeUtc) : '—'],
                ['Time', slot ? formatTimeRange(slot.startTimeUtc, slot.endTimeUtc) : '—'],
                [
                  'Availability',
                  slot ? (
                    <span className={`rm-availability${remaining <= 1 ? ' is-low' : ''}`}>
                      <span className="rm-availability__dot" />
                      {remaining === 1 ? '1 space remaining' : `${remaining} spaces remaining`}
                    </span>
                  ) : (
                    '—'
                  ),
                ],
              ]}
            />

            <div className="rm-panel__status">
              <span className="rm-muted">Status after booking</span>
              <StatusBadge status="Pending" label="Pending approval" />
            </div>

            <ErrorNotice error={error} />

            <button type="submit" className="rm-button rm-button--primary rm-button--block rm-button--lg" disabled={!canSubmit}>
              <Icon name="check_circle" />
              {submitting ? 'Booking…' : 'Confirm booking'}
            </button>

            <p className="rm-panel__policy">
              The prosumer can change or cancel this reservation until 12 hours before the slot
              starts.
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}

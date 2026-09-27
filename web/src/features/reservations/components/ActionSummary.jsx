import { formatDateTime, formatLongDate, formatTimeRange } from '../format';
import {
  DetailList,
  Icon,
  Notice,
  PageHeader,
  ProsumerLabel,
  Reference,
  StatusBadge,
  StepHeader,
  ValueStack,
} from './ui';

const ACTIONS = {
  created: {
    icon: 'check_circle',
    tone: 'success',
    title: 'Booking confirmed',
    description: 'The reservation is saved as Pending and a space has been reserved in the slot.',
  },
  updated: {
    icon: 'published_with_changes',
    tone: 'success',
    title: 'Booking changed',
    description: 'The reservation now uses the new slot. The space in the old slot has been released.',
  },
  cancelled: {
    icon: 'event_busy',
    tone: 'neutral',
    title: 'Booking cancelled',
    description: 'The reservation is cancelled and its space has been released for other prosumers.',
  },
};

export default function ActionSummary({
  action,
  summary,
  previous,
  refData,
  onViewDetails,
  onNewBooking,
  onHome,
}) {
  const config = ACTIONS[action];
  const reservation = summary.reservation;
  const station = refData.stationById.get(reservation.stationId);
  const prosumer = refData.prosumerByNic.get(reservation.prosumerId);
  const previousReservation = previous?.reservation;
  const previousStation = previousReservation && refData.stationById.get(previousReservation.stationId);
  const wasApproved = action === 'updated' && previousReservation?.status === 'Approved';

  return (
    <div className="rm-page rm-page--narrow">
      <PageHeader onBack={onHome} backLabel="Reservations" eyebrow="Summary" title={config.title} />

      <div className={`rm-result rm-result--${config.tone}`}>
        <span className="rm-result__icon">
          <Icon name={config.icon} />
        </span>
        <div>
          <strong>{summary.message}</strong>
          <p>{config.description}</p>
        </div>
      </div>

      <section className="rm-card">
        <StepHeader title="Booking summary" aside={<StatusBadge status={reservation.status} />} />
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
            ...(action === 'updated' && previousReservation
              ? [
                  [
                    'Moved from',
                    <ValueStack
                      key="from"
                      main={previousStation?.name ?? previousReservation.stationId}
                      sub={`${formatLongDate(previousReservation.slotStartTimeUtc)}, ${formatTimeRange(
                        previousReservation.slotStartTimeUtc,
                        previousReservation.slotEndTimeUtc,
                      )}`}
                    />,
                  ],
                ]
              : []),
            ...(reservation.cancelledAtUtc
              ? [['Cancelled at', formatDateTime(reservation.cancelledAtUtc)]]
              : []),
            ...(action !== 'cancelled' && reservation.remainingBookings != null
              ? [['Spaces left in slot', reservation.remainingBookings]]
              : []),
          ]}
        />
      </section>

      {wasApproved && (
        <Notice tone="warning" title="Needs approval again">
          This booking was approved before the change. It is Pending again and the previous QR code
          is no longer valid.
        </Notice>
      )}

      {action === 'created' && (
        <Notice tone="info" title="What happens next">
          A Backoffice user reviews and approves the booking. The prosumer can change or cancel it
          until 12 hours before the start time.
        </Notice>
      )}

      <div className="rm-actions-row">
        <button type="button" className="rm-button rm-button--primary" onClick={() => onViewDetails(reservation.id)}>
          <Icon name="visibility" />
          View details
        </button>
        <button type="button" className="rm-button rm-button--soft" onClick={onNewBooking}>
          <Icon name="add" />
          New booking
        </button>
        <button type="button" className="rm-button rm-button--ghost" onClick={onHome}>
          Back to reservations
        </button>
      </div>
    </div>
  );
}

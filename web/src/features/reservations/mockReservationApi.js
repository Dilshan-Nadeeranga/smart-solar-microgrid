import { createDemoData } from './mockData';
import { ACTIVE_STATUSES, MIN_NOTICE_MS, SEVEN_DAYS_MS, overlaps } from './reservationRules';

// In-memory stand-in for the C# API. Function names, request fields, error
// messages and the summary shape match ReservationsController so the UI can
// switch to fetch() calls without changing the screens.

const LATENCY_MS = 350;

let db = createDemoData();

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const sleep = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
const clone = (value) => structuredClone(value);

function newObjectId() {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  let random = '';
  for (let i = 0; i < 16; i += 1) {
    random += Math.floor(Math.random() * 16).toString(16);
  }
  return timestamp + random;
}

function buildSummary(reservation, slot, message) {
  return {
    message,
    reservationId: reservation.id,
    reservation: {
      id: reservation.id,
      prosumerId: reservation.prosumerId,
      stationId: reservation.stationId,
      slotId: reservation.slotId,
      status: reservation.status,
      createdAtUtc: reservation.createdAtUtc,
      updatedAtUtc: reservation.updatedAtUtc,
      cancelledAtUtc: reservation.cancelledAtUtc,
      version: reservation.version,
      slotStartTimeUtc: slot?.startTimeUtc ?? null,
      slotEndTimeUtc: slot?.endTimeUtc ?? null,
      remainingBookings: slot ? Math.max(0, slot.maximumBookings - slot.reservedBookings) : null,
    },
  };
}

function findReservation(id) {
  const reservation = db.reservations.find((item) => item.id === id?.trim());
  if (!reservation) throw new ApiError(404, 'Reservation not found.');
  return reservation;
}

function loadActiveSlot(slotId) {
  const slot = db.slots.find((item) => item.id === slotId);
  if (!slot) throw new ApiError(404, 'Energy slot not found.');
  if (!slot.isActive) throw new ApiError(400, 'The selected energy slot is inactive.');
  return slot;
}

function loadActiveStation(stationId) {
  const station = db.stations.find((item) => item.id === stationId);
  if (!station) throw new ApiError(404, 'Station not found.');
  if (!station.isActive) throw new ApiError(400, 'The selected station is inactive.');
  return station;
}

function ensureStationMatches(slot, stationId) {
  if (stationId && slot.stationId !== stationId) {
    throw new ApiError(400, 'The selected slot does not belong to the specified station.');
  }
}

function ensureWithinSevenDays(slot) {
  const start = new Date(slot.startTimeUtc).getTime();
  const now = Date.now();

  if (start <= now) throw new ApiError(400, 'Cannot book a slot that has already started.');
  if (start > now + SEVEN_DAYS_MS) {
    throw new ApiError(400, 'Reservations are only allowed within the next seven days.');
  }
}

function ensureAtLeastTwelveHours(slot) {
  if (new Date(slot.startTimeUtc).getTime() - Date.now() < MIN_NOTICE_MS) {
    throw new ApiError(400, 'Changes require at least 12 hours before the slot start time.');
  }
}

function ensureNoConflict(prosumerId, newSlot, excludeId) {
  const active = db.reservations.filter(
    (item) =>
      item.prosumerId === prosumerId &&
      item.id !== excludeId &&
      ACTIVE_STATUSES.includes(item.status),
  );

  if (active.some((item) => item.slotId === newSlot.id)) {
    throw new ApiError(409, 'You already have an active reservation for this energy slot.');
  }

  const newStart = new Date(newSlot.startTimeUtc).getTime();
  const newEnd = new Date(newSlot.endTimeUtc).getTime();

  for (const item of active) {
    const slot = db.slots.find((s) => s.id === item.slotId);
    if (!slot) continue;

    const start = new Date(slot.startTimeUtc).getTime();
    const end = new Date(slot.endTimeUtc).getTime();

    if (overlaps(newStart, newEnd, start, end)) {
      throw new ApiError(409, 'This booking overlaps an existing active reservation.');
    }
  }
}

function ensureVersion(reservation, version) {
  if (version != null && reservation.version !== version) {
    throw new ApiError(409, 'The reservation was changed by another request. Refresh and try again.');
  }
}

// POST /api/reservations
export async function createReservation({ prosumerId, stationId, slotId }) {
  await sleep();

  const nic = prosumerId?.trim();
  if (!nic) {
    throw new ApiError(400, 'Staff must provide the prosumer NIC when creating a reservation.');
  }

  const prosumer = db.prosumers.find((item) => item.nic === nic);
  if (!prosumer) throw new ApiError(404, 'Prosumer account not found.');
  if (prosumer.accountStatus !== 'ACTIVE') {
    throw new ApiError(403, 'The prosumer account is not active.');
  }

  if (!slotId) throw new ApiError(400, 'Slot ID is required.');

  const slot = loadActiveSlot(slotId);
  ensureStationMatches(slot, stationId);
  loadActiveStation(slot.stationId);
  ensureWithinSevenDays(slot);
  ensureNoConflict(nic, slot, null);

  if (slot.reservedBookings >= slot.maximumBookings) {
    throw new ApiError(409, 'This energy slot has no remaining capacity.');
  }

  slot.reservedBookings += 1;

  const now = new Date().toISOString();
  const reservation = {
    id: newObjectId(),
    prosumerId: nic,
    stationId: slot.stationId,
    slotId: slot.id,
    status: 'Pending',
    createdAtUtc: now,
    updatedAtUtc: now,
    cancelledAtUtc: null,
    version: 1,
  };

  db.reservations.push(reservation);

  return clone(buildSummary(reservation, slot, 'Reservation created.'));
}

// GET /api/reservations/{id}
export async function getReservation(id) {
  await sleep();

  const reservation = findReservation(id);
  const slot = db.slots.find((item) => item.id === reservation.slotId);

  return clone(buildSummary(reservation, slot, 'Reservation details retrieved.'));
}

// PUT /api/reservations/{id}
export async function updateReservation(id, { slotId, stationId, version }) {
  await sleep();

  if (!slotId) throw new ApiError(400, 'New slot ID is required.');

  const reservation = findReservation(id);

  if (!ACTIVE_STATUSES.includes(reservation.status)) {
    throw new ApiError(400, `Cannot update a ${reservation.status} reservation.`);
  }

  ensureVersion(reservation, version);

  const currentSlot = db.slots.find((item) => item.id === reservation.slotId);
  if (!currentSlot) throw new ApiError(404, "The reservation's current energy slot was not found.");

  ensureAtLeastTwelveHours(currentSlot);

  if (reservation.slotId === slotId) {
    throw new ApiError(400, 'The reservation already uses this energy slot.');
  }

  const newSlot = loadActiveSlot(slotId);
  ensureStationMatches(newSlot, stationId);
  loadActiveStation(newSlot.stationId);
  ensureWithinSevenDays(newSlot);
  ensureNoConflict(reservation.prosumerId, newSlot, reservation.id);

  if (newSlot.reservedBookings >= newSlot.maximumBookings) {
    throw new ApiError(409, 'The selected energy slot has no remaining capacity.');
  }

  const wasApproved = reservation.status === 'Approved';

  currentSlot.reservedBookings = Math.max(0, currentSlot.reservedBookings - 1);
  newSlot.reservedBookings += 1;

  reservation.stationId = newSlot.stationId;
  reservation.slotId = newSlot.id;
  reservation.status = 'Pending';
  reservation.updatedAtUtc = new Date().toISOString();
  reservation.version += 1;

  const message = wasApproved
    ? 'Reservation updated. Status returned to Pending.'
    : 'Reservation updated.';

  return clone(buildSummary(reservation, newSlot, message));
}

// PATCH /api/reservations/{id}/cancel
export async function cancelReservation(id, { version } = {}) {
  await sleep();

  const reservation = findReservation(id);

  if (reservation.status === 'Cancelled') {
    throw new ApiError(409, 'Reservation is already cancelled. Capacity was not released again.');
  }

  if (reservation.status === 'Rejected' || reservation.status === 'Completed') {
    throw new ApiError(400, `Cannot cancel a ${reservation.status} reservation.`);
  }

  ensureVersion(reservation, version);

  const slot = db.slots.find((item) => item.id === reservation.slotId);
  if (!slot) throw new ApiError(404, "The reservation's energy slot was not found.");

  ensureAtLeastTwelveHours(slot);

  slot.reservedBookings = Math.max(0, slot.reservedBookings - 1);

  const now = new Date().toISOString();
  reservation.status = 'Cancelled';
  reservation.cancelledAtUtc = now;
  reservation.updatedAtUtc = now;
  reservation.version += 1;

  return clone(buildSummary(reservation, slot, 'Reservation cancelled.'));
}

// Stand-ins for Member 2's station/slot endpoints and Member 1's user lookup.

export async function listStations() {
  await sleep();
  return clone(db.stations);
}

export async function listSlotsForStation(stationId) {
  await sleep();
  return clone(
    db.slots
      .filter((slot) => slot.stationId === stationId)
      .sort((a, b) => a.startTimeUtc.localeCompare(b.startTimeUtc)),
  );
}

export async function listProsumers() {
  await sleep();
  return clone(db.prosumers);
}

export async function getProsumer(nic) {
  await sleep();
  const prosumer = db.prosumers.find((item) => item.nic === nic?.trim());
  if (!prosumer) throw new ApiError(404, 'Prosumer account not found.');
  return clone(prosumer);
}

// Demo-only helpers. Booking lists belong to Member 4.

export async function listSampleReservations() {
  await sleep();
  return clone(
    db.reservations.map((reservation) =>
      buildSummary(
        reservation,
        db.slots.find((slot) => slot.id === reservation.slotId),
        '',
      ).reservation,
    ),
  );
}

export function resetDemoData() {
  db = createDemoData();
}

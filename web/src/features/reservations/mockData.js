const HOUR_MS = 60 * 60 * 1000;
const HALF_HOUR_MS = HOUR_MS / 2;

function slotAt(id, stationId, hoursFromNow, maximumBookings, reservedBookings, isActive = true) {
  const start = Math.ceil((Date.now() + hoursFromNow * HOUR_MS) / HALF_HOUR_MS) * HALF_HOUR_MS;

  return {
    id,
    stationId,
    startTimeUtc: new Date(start).toISOString(),
    endTimeUtc: new Date(start + HOUR_MS).toISOString(),
    maximumBookings,
    reservedBookings,
    isActive,
  };
}

function reservationFor(id, prosumerId, slot, status, version, extra = {}) {
  const created = new Date(Date.now() - 2 * 24 * HOUR_MS).toISOString();

  return {
    id,
    prosumerId,
    stationId: slot.stationId,
    slotId: slot.id,
    status,
    createdAtUtc: created,
    updatedAtUtc: created,
    cancelledAtUtc: null,
    version,
    ...extra,
  };
}

export function createDemoData() {
  const stations = [
    {
      id: '665f1b9a8a1b2c3d4e5f6a70',
      name: 'Colombo North Solar Hub',
      address: '42 Negombo Road, Wattala',
      capacityKw: 450,
      isActive: true,
    },
    {
      id: '665f1b9a8a1b2c3d4e5f6a71',
      name: 'Kandy Hills Energy Station',
      address: '18 Peradeniya Road, Kandy',
      capacityKw: 280,
      isActive: true,
    },
    {
      id: '665f1b9a8a1b2c3d4e5f6a72',
      name: 'Galle Coastal Station',
      address: '7 Matara Road, Galle',
      capacityKw: 320,
      isActive: false,
    },
  ];

  const [colombo, kandy, galle] = stations.map((station) => station.id);

  const slots = [
    slotAt('665f1c2e8a1b2c3d4e5f6a01', colombo, -48, 4, 1),
    slotAt('665f1c2e8a1b2c3d4e5f6a02', colombo, 6, 4, 2),
    slotAt('665f1c2e8a1b2c3d4e5f6a03', colombo, 26, 5, 2),
    slotAt('665f1c2e8a1b2c3d4e5f6a04', colombo, 28, 5, 0),
    slotAt('665f1c2e8a1b2c3d4e5f6a05', colombo, 50, 3, 1),
    slotAt('665f1c2e8a1b2c3d4e5f6a06', colombo, 74, 3, 3),
    slotAt('665f1c2e8a1b2c3d4e5f6a07', colombo, 100, 4, 0, false),
    slotAt('665f1c2e8a1b2c3d4e5f6a08', colombo, 150, 6, 1),
    slotAt('665f1c2e8a1b2c3d4e5f6a09', colombo, 168, 6, 0),
    slotAt('665f1c2e8a1b2c3d4e5f6a10', kandy, 30, 4, 0),
    slotAt('665f1c2e8a1b2c3d4e5f6a11', kandy, 54, 4, 2),
    slotAt('665f1c2e8a1b2c3d4e5f6a12', kandy, 78, 2, 1),
    slotAt('665f1c2e8a1b2c3d4e5f6a13', kandy, 120, 5, 0),
    slotAt('665f1c2e8a1b2c3d4e5f6a14', galle, 40, 4, 0),
  ];

  const slotById = new Map(slots.map((slot) => [slot.id, slot]));

  const prosumers = [
    {
      nic: '200012345678',
      name: 'Nimal Perera',
      address: '15 Station Road, Wattala',
      accountStatus: 'ACTIVE',
    },
    {
      nic: '199845612378',
      name: 'Kamala Silva',
      address: '8 Temple Lane, Kandy',
      accountStatus: 'ACTIVE',
    },
    {
      nic: '200156789012',
      name: 'Ruwan Fernando',
      address: '27 Beach Road, Galle',
      accountStatus: 'DEACTIVATED',
    },
  ];

  const reservations = [
    reservationFor(
      '6710a1f28a1b2c3d4e5f6b01',
      '200012345678',
      slotById.get('665f1c2e8a1b2c3d4e5f6a03'),
      'Pending',
      1,
    ),
    reservationFor(
      '6710a1f28a1b2c3d4e5f6b02',
      '200012345678',
      slotById.get('665f1c2e8a1b2c3d4e5f6a11'),
      'Approved',
      2,
    ),
    reservationFor(
      '6710a1f28a1b2c3d4e5f6b03',
      '199845612378',
      slotById.get('665f1c2e8a1b2c3d4e5f6a02'),
      'Approved',
      2,
    ),
    reservationFor(
      '6710a1f28a1b2c3d4e5f6b04',
      '199845612378',
      slotById.get('665f1c2e8a1b2c3d4e5f6a10'),
      'Cancelled',
      2,
      { cancelledAtUtc: new Date(Date.now() - 24 * HOUR_MS).toISOString() },
    ),
    reservationFor(
      '6710a1f28a1b2c3d4e5f6b05',
      '200012345678',
      slotById.get('665f1c2e8a1b2c3d4e5f6a01'),
      'Completed',
      3,
    ),
  ];

  return { stations, slots, prosumers, reservations };
}

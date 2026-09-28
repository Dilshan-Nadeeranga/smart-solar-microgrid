import { stationsApi } from '../../api.js';

const OBJECT_ID = /^[a-f\d]{24}$/i;

export async function ensureStoredSlot(stationId, slot) {
  if (OBJECT_ID.test(slot.id)) return slot.id;

  const created = await stationsApi.createSlot(stationId, {
    startTimeUtc: slot.startTimeUtc,
    endTimeUtc: slot.endTimeUtc,
    maximumBookings: slot.maximumBookings,
  });

  return created.id;
}

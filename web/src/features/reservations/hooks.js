import { useEffect, useMemo, useState } from 'react';
import { reservationsApi, stationsApi, usersApi } from '../../api.js';
import { dayKey } from './format';
import { HOUR_MS } from './reservationRules';

const BOOKING_DAY_COUNT = 8;

function localDays(dayCount) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: dayCount }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function utcDatesCovering(days) {
  const start = days[0];
  const end = new Date(days[days.length - 1]);
  end.setDate(end.getDate() + 1);

  const dates = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = end.getTime() - 1;

  while (cursor.getTime() <= last) {
    const month = String(cursor.getUTCMonth() + 1).padStart(2, '0');
    const day = String(cursor.getUTCDate()).padStart(2, '0');
    dates.push(`${cursor.getUTCFullYear()}-${month}-${day}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function weekdayName(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function localDateTime(day, timeText) {
  const [hours, minutes, seconds] = String(timeText || '00:00:00')
    .split(':')
    .map((part) => Number(part) || 0);
  const date = new Date(day);
  date.setHours(hours, minutes, seconds, 0);
  return date;
}

function hourlyWindows(start, end) {
  const windows = [];
  for (let cursor = start.getTime(); cursor + HOUR_MS <= end.getTime(); cursor += HOUR_MS) {
    windows.push([new Date(cursor), new Date(cursor + HOUR_MS)]);
  }
  return windows;
}

async function listLiveSlots(stationId) {
  const days = localDays(BOOKING_DAY_COUNT);
  const [station, schedules, groups] = await Promise.all([
    stationsApi.get(stationId),
    stationsApi.schedules(stationId),
    Promise.all(utcDatesCovering(days).map((dateUtc) => stationsApi.slots(stationId, dateUtc))),
  ]);

  const byId = new Map();
  for (const group of groups) {
    for (const slot of group ?? []) byId.set(slot.id, slot);
  }

  const visible = new Set(days.map((day) => dayKey(day)));
  const stored = [...byId.values()].filter((slot) => visible.has(dayKey(slot.startTimeUtc)));
  const slots = [];
  const capacity = Number(station?.batteryStorageSlots) > 0 ? Number(station.batteryStorageSlots) : 1;

  for (const day of days) {
    const key = dayKey(day);
    const schedule = (schedules ?? []).find((item) => item.day === weekdayName(day));
    const daySlots = stored.filter((slot) => dayKey(slot.startTimeUtc) === key);

    const hours = schedule?.isAvailable
      ? hourlyWindows(localDateTime(day, schedule.openingTime), localDateTime(day, schedule.closingTime))
      : [];
    const used = new Set();

    hours.forEach(([start, end], index) => {
      const match = daySlots.find((slot) => {
        const slotStart = new Date(slot.startTimeUtc).getTime();
        const slotEnd = new Date(slot.endTimeUtc).getTime();
        return Math.abs(slotStart - start.getTime()) < 60000 && Math.abs(slotEnd - end.getTime()) < 60000;
      });

      if (match) {
        used.add(match.id);
        slots.push(match);
        return;
      }

      slots.push({
        id: `${schedule.id}:${key}:${index}`,
        stationId,
        startTimeUtc: start.toISOString(),
        endTimeUtc: end.toISOString(),
        maximumBookings: capacity,
        reservedBookings: 0,
        isActive: true,
      });
    });

    for (const slot of daySlots) {
      if (used.has(slot.id)) continue;

      const windows = hourlyWindows(new Date(slot.startTimeUtc), new Date(slot.endTimeUtc));
      const pieces = windows.length > 0 ? windows : [[new Date(slot.startTimeUtc), new Date(slot.endTimeUtc)]];
      pieces.forEach(([start, end], index) => {
        const exactHour = pieces.length === 1 && end - start === HOUR_MS;
        slots.push({
          ...slot,
          id: exactHour ? slot.id : `${slot.id}:${index}`,
          startTimeUtc: start.toISOString(),
          endTimeUtc: end.toISOString(),
        });
      });
    }
  }

  slots.sort((a, b) => new Date(a.startTimeUtc) - new Date(b.startTimeUtc));

  return { slots, schedules: schedules ?? [] };
}

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}

export function useReferenceData() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;

    Promise.all([stationsApi.list(), usersApi.listProsumers()])
      .then(([stations, prosumers]) => {
        if (active) setData({ stations: stations ?? [], prosumers: prosumers ?? [] });
      })
      .catch(() => {
        if (active) setData({ stations: [], prosumers: [] });
      });

    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => {
    const stations = data?.stations ?? [];
    const prosumers = data?.prosumers ?? [];

    return {
      ready: data !== null,
      stations,
      prosumers,
      stationById: new Map(stations.map((station) => [station.id, station])),
      prosumerByNic: new Map(prosumers.map((prosumer) => [prosumer.nic, prosumer])),
    };
  }, [data]);
}

export function useStationSlots(stationId, refreshKey = 0) {
  const requestKey = `${stationId}:${refreshKey}`;
  const [state, setState] = useState({ key: null, slots: [], schedules: [], error: null });

  useEffect(() => {
    if (!stationId) return undefined;

    let active = true;

    listLiveSlots(stationId)
      .then((result) => {
        if (!active) return;
        setState({ key: requestKey, slots: result.slots, schedules: result.schedules, error: null });
      })
      .catch((error) => {
        if (active) setState({ key: requestKey, slots: [], schedules: [], error });
      });

    return () => {
      active = false;
    };
  }, [stationId, requestKey]);

  const loaded = state.key === requestKey;

  return {
    slots: loaded ? state.slots : [],
    schedules: loaded ? state.schedules : [],
    error: loaded ? state.error : null,
    loading: Boolean(stationId) && !loaded,
  };
}

export function useReservation(id, reloadKey = 0) {
  const requestKey = `${id}:${reloadKey}`;
  const [state, setState] = useState({ key: null, summary: null, error: null });

  useEffect(() => {
    let active = true;

    reservationsApi.get(id)
      .then((summary) => {
        if (active) setState({ key: requestKey, summary, error: null });
      })
      .catch((error) => {
        if (active) setState({ key: requestKey, summary: null, error });
      });

    return () => {
      active = false;
    };
  }, [id, requestKey]);

  const loaded = state.key === requestKey;

  return {
    summary: loaded ? state.summary : null,
    error: loaded ? state.error : null,
    loading: !loaded,
  };
}

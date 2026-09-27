import { useEffect, useMemo, useState } from 'react';
import {
  getReservation,
  listProsumers,
  listSlotsForStation,
  listStations,
} from './mockReservationApi';

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

    Promise.all([listStations(), listProsumers()]).then(([stations, prosumers]) => {
      if (active) setData({ stations, prosumers });
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
  const [state, setState] = useState({ key: null, slots: [] });

  useEffect(() => {
    if (!stationId) return undefined;

    let active = true;

    listSlotsForStation(stationId).then((slots) => {
      if (active) setState({ key: requestKey, slots });
    });

    return () => {
      active = false;
    };
  }, [stationId, requestKey]);

  const loaded = state.key === requestKey;

  return {
    slots: loaded ? state.slots : [],
    loading: Boolean(stationId) && !loaded,
  };
}

export function useReservation(id, reloadKey = 0) {
  const requestKey = `${id}:${reloadKey}`;
  const [state, setState] = useState({ key: null, summary: null, error: null });

  useEffect(() => {
    let active = true;

    getReservation(id)
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

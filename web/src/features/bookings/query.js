import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

/*
 * Tiny query cache for the Bookings pages: shared results per key, polling,
 * refetch on window focus, and invalidation after approve / reject.
 */

export const REFETCH_INTERVAL_MS = 30_000
const FOCUS_REFETCH_MIN_AGE_MS = 2_000
const MAX_IDLE_ENTRIES = 40

const INITIAL = Object.freeze({ data: undefined, error: null, isFetching: false, updatedAt: 0 })

const entries = new Map()

function getEntry(key) {
  let entry = entries.get(key)
  if (!entry) {
    entry = { snapshot: INITIAL, listeners: new Set(), fetcher: null, promise: null, stale: true, queued: false }
    entries.set(key, entry)
  }
  return entry
}

function update(entry, patch) {
  entry.snapshot = { ...entry.snapshot, ...patch }
  entry.listeners.forEach((listener) => listener())
}

function collectIdleEntries() {
  if (entries.size <= MAX_IDLE_ENTRIES) return
  for (const [key, entry] of entries) {
    if (entry.listeners.size === 0 && !entry.promise) entries.delete(key)
    if (entries.size <= MAX_IDLE_ENTRIES) return
  }
}

/** Runs the fetcher for `key`. Concurrent calls share one request. */
export function fetchQuery(key, { minAgeMs = 0 } = {}) {
  const entry = getEntry(key)
  if (!entry.fetcher) return Promise.resolve()
  if (entry.promise) return entry.promise
  if (minAgeMs && !entry.stale && Date.now() - entry.snapshot.updatedAt < minAgeMs) {
    return Promise.resolve()
  }

  update(entry, { isFetching: true })
  entry.promise = entry
    .fetcher()
    .then(
      (data) => {
        entry.stale = false
        update(entry, { data, error: null, isFetching: false, updatedAt: Date.now() })
      },
      (error) => {
        update(entry, { error, isFetching: false })
      },
    )
    .finally(() => {
      entry.promise = null
      // An invalidation arrived while this request was in flight: its result may be old.
      if (entry.queued) {
        entry.queued = false
        fetchQuery(key)
      }
    })
  return entry.promise
}

/** Marks every key starting with `prefix` stale and refetches the ones on screen. */
export function invalidateQueries(prefix) {
  for (const [key, entry] of entries) {
    if (!key.startsWith(prefix)) continue
    entry.stale = true
    if (entry.listeners.size === 0) continue
    if (entry.promise) entry.queued = true
    else fetchQuery(key)
  }
}

/** Replaces cached data, e.g. with the reservation returned by approve / reject. */
export function setQueryData(key, data) {
  const entry = getEntry(key)
  update(entry, { data, error: null, updatedAt: Date.now() })
}

/**
 * Redirects to login on 401. Other errors are left to the caller.
 * @returns {(error: unknown) => boolean} true when the error was a 401
 */
export function useSessionGuard() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return useCallback(
    (error) => {
      if (error?.status !== 401) return false
      logout()
      navigate('/login', { replace: true })
      return true
    },
    [logout, navigate],
  )
}

/**
 * @template T
 * @param {string} key cache key; include every parameter the fetcher uses
 * @param {() => Promise<T>} fetcher
 * @param {{ enabled?: boolean, refetchInterval?: number|false, keepPreviousData?: boolean }} [options]
 */
export function useQuery(key, fetcher, options = {}) {
  const { enabled = true, refetchInterval = REFETCH_INTERVAL_MS, keepPreviousData = false } = options

  const subscribe = useCallback(
    (listener) => {
      const entry = getEntry(key)
      entry.listeners.add(listener)
      return () => {
        entry.listeners.delete(listener)
        collectIdleEntries()
      }
    },
    [key],
  )
  const snapshot = useSyncExternalStore(subscribe, () => getEntry(key).snapshot)

  // Always use the latest fetcher (it closes over the current params).
  useEffect(() => {
    getEntry(key).fetcher = fetcher
  })

  useEffect(() => {
    if (!enabled) return undefined
    const entry = getEntry(key)
    if (entry.stale || entry.snapshot.data === undefined) fetchQuery(key)

    const refetchIfVisible = () => {
      if (document.visibilityState === 'visible') fetchQuery(key, { minAgeMs: FOCUS_REFETCH_MIN_AGE_MS })
    }
    const timer = refetchInterval
      ? setInterval(() => {
          // Several components can poll the same key; skip if another one just refreshed it.
          if (document.visibilityState === 'visible') fetchQuery(key, { minAgeMs: refetchInterval - 1_000 })
        }, refetchInterval)
      : null

    window.addEventListener('focus', refetchIfVisible)
    document.addEventListener('visibilitychange', refetchIfVisible)
    return () => {
      if (timer) clearInterval(timer)
      window.removeEventListener('focus', refetchIfVisible)
      document.removeEventListener('visibilitychange', refetchIfVisible)
    }
  }, [key, enabled, refetchInterval])

  const guard = useSessionGuard()
  useEffect(() => {
    if (snapshot.error) guard(snapshot.error)
  }, [snapshot.error, guard])

  // Keep the last result on screen while a new filter combination loads.
  const [previous, setPrevious] = useState(undefined)
  if (keepPreviousData && snapshot.data !== undefined && snapshot.data !== previous) {
    setPrevious(snapshot.data)
  }

  const hasOwnData = snapshot.data !== undefined
  const showPrevious = keepPreviousData && !hasOwnData && !snapshot.error && previous !== undefined
  const data = hasOwnData ? snapshot.data : showPrevious ? previous : undefined

  const refetch = useCallback(() => fetchQuery(key), [key])

  return {
    data,
    error: snapshot.error,
    /** No data yet and no error: show a skeleton. */
    isLoading: enabled && data === undefined && !snapshot.error,
    /** Failed with nothing to show: show the error state. */
    isError: Boolean(snapshot.error) && data === undefined,
    isFetching: snapshot.isFetching,
    /** Showing results from the previous filters while new ones load. */
    isPlaceholder: showPrevious,
    updatedAt: hasOwnData ? snapshot.updatedAt : 0,
    refetch,
  }
}

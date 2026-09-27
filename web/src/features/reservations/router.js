import { useMemo, useSyncExternalStore } from 'react';

export const BASE_PATH = '/reservations';

const NAVIGATE_EVENT = 'rm:navigate';
const SUMMARY_ACTIONS = ['created', 'updated', 'cancelled'];

export const paths = {
  home: () => BASE_PATH,
  create: () => `${BASE_PATH}/new`,
  details: (id) => `${BASE_PATH}/${encodeURIComponent(id)}`,
  edit: (id) => `${BASE_PATH}/${encodeURIComponent(id)}/edit`,
  summary: (id, action) => `${BASE_PATH}/${encodeURIComponent(id)}/${action}`,
};

export function navigate(path, { state = null, replace = false } = {}) {
  if (replace) window.history.replaceState(state, '', path);
  else window.history.pushState(state, '', path);

  window.dispatchEvent(new Event(NAVIGATE_EVENT));
  window.scrollTo({ top: 0 });
}

export function isReservationsPath(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === BASE_PATH || path.startsWith(`${BASE_PATH}/`);
}

export function matchRoute(pathname, state) {
  const path = pathname.replace(/\/+$/, '') || '/';

  if (!isReservationsPath(path)) return { name: 'outside' };

  const parts = path
    .slice(BASE_PATH.length)
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);

  if (parts.length === 0) return { name: 'home' };
  if (parts.length === 1 && parts[0] === 'new') return { name: 'create' };

  const [id, sub] = parts;

  if (parts.length === 1) return { name: 'details', id };
  if (parts.length === 2 && sub === 'edit') return { name: 'edit', id };
  if (parts.length === 2 && SUMMARY_ACTIONS.includes(sub)) {
    return {
      name: 'summary',
      id,
      action: sub,
      summary: state?.summary ?? null,
      previous: state?.previous ?? null,
    };
  }

  return { name: 'notFound' };
}

function subscribe(callback) {
  window.addEventListener('popstate', callback);
  window.addEventListener(NAVIGATE_EVENT, callback);

  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener(NAVIGATE_EVENT, callback);
  };
}

export function useRoute() {
  const pathname = useSyncExternalStore(subscribe, () => window.location.pathname);
  const state = useSyncExternalStore(subscribe, () => window.history.state);

  return useMemo(() => matchRoute(pathname, state), [pathname, state]);
}

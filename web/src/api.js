async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }

  let response
  try {
    response = await fetch(`/api${path}`, { ...options, headers })
  } catch {
    throw new Error('Cannot reach the API. Start it with dotnet run in the api folder.')
  }

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }

  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`)
  }

  return data
}

export const stationsApi = {
  list: () => request('/stations'),
  get: (id) => request(`/stations/${id}`),
  create: (body) => request('/stations', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/stations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deactivate: (id) => request(`/stations/${id}/deactivate`, { method: 'PATCH' }),
  nearby: ({ latitude, longitude, radiusKm }) =>
    request(
      `/stations/nearby?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&radiusKm=${encodeURIComponent(radiusKm)}`,
    ),
  slots: (id, dateUtc) =>
    request(`/stations/${id}/slots?dateUtc=${encodeURIComponent(dateUtc)}`),
  schedules: (id) => request(`/stations/${id}/schedules`),
  createSchedule: (id, body) =>
    request(`/stations/${id}/schedules`, { method: 'POST', body: JSON.stringify(body) }),
  updateSchedule: (id, scheduleId, body) =>
    request(`/stations/${id}/schedules/${scheduleId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  createSlot: (stationId, body) =>
    request(`/booking-slots/station/${stationId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getSlot: (id) => request(`/booking-slots/${id}`),
}

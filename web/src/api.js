async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }
  
  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
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
    if (response.status === 401) {
      throw new Error('Session expired. Please login again.')
    }
    if (response.status === 403) {
      throw new Error('You do not have permission to perform this action.')
    }
    if (response.status === 404) {
      throw new Error('User not found.')
    }
    const error = new Error(data?.message || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }

  return data
}

export const authApi = {
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
}

export const usersApi = {
  getProfile: (nic) => request(`/users/${nic}`),
  createProsumer: (body) => request('/users', { method: 'POST', body: JSON.stringify(body) }),
  createStaff: (body) => request('/users/staff', { method: 'POST', body: JSON.stringify(body) }),
  getPending: () => request('/users/pending'),
  activate: (nic) => request(`/users/${nic}/activate`, { method: 'PATCH' }),
  deactivate: (nic) => request(`/users/${nic}/deactivate`, { method: 'PATCH' }),
  reactivate: (nic) => request(`/users/${nic}/reactivate`, { method: 'PATCH' }),
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

export const reservationsApi = {
  list: () => request('/reservations/desk?pageSize=100'),
  get: (id) => request(`/reservations/desk/${encodeURIComponent(id)}`),
  create: (body) => request('/reservations/desk', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/reservations/desk/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  cancel: (id, body) =>
    request(`/reservations/desk/${encodeURIComponent(id)}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
}

export const usersApi = {
  listProsumers: () => request('/users/prosumers'),
  getBookingProfile: (nic) => request(`/users/${encodeURIComponent(nic)}/booking`),
}

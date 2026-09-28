import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { stationsApi } from '../../../api.js'

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const emptyStation = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  capacityKw: '',
  batteryStorageSlots: '',
}

const weekSchedule = days.map((day) => ({
  day,
  openingTime: '08:00:00',
  closingTime: '17:00:00',
  isAvailable: true,
}))

function clock(value) {
  if (!value) return '00:00:00'
  const text = String(value)
  if (text.length >= 8) return text.slice(0, 8)
  return `${text}:00`.slice(0, 8)
}

function toStationBody(form) {
  return {
    name: form.name.trim(),
    address: form.address.trim(),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    capacityKw: Number(form.capacityKw),
    batteryStorageSlots: Number(form.batteryStorageSlots || 0),
  }
}

function validateStation(form) {
  const body = toStationBody(form)
  if (!body.name) return 'Station name is required.'
  if (Number.isNaN(body.latitude) || body.latitude < -90 || body.latitude > 90) {
    return 'Latitude must be between -90 and 90.'
  }
  if (Number.isNaN(body.longitude) || body.longitude < -180 || body.longitude > 180) {
    return 'Longitude must be between -180 and 180.'
  }
  if (!(body.capacityKw > 0)) return 'Capacity must be greater than zero.'
  return null
}

const fieldClass =
  'h-11 w-full rounded-lg bg-surface-container-low px-3.5 text-body-sm text-on-surface shadow-sm outline-none focus:ring-2 focus:ring-primary-container'

const scheduleFieldClass =
  'h-11 w-full rounded-lg bg-surface-container-lowest px-3.5 text-body-sm text-on-surface shadow-sm outline-none focus:ring-2 focus:ring-primary-container'

export default function CreateStationPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyStation)
  const [schedules, setSchedules] = useState(weekSchedule)
  const [editingDay, setEditingDay] = useState('')
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(false)

  function updateSchedule(day, patch) {
    setSchedules((current) => current.map((item) => (item.day === day ? { ...item, ...patch } : item)))
  }

  async function handleCreate(event) {
    event.preventDefault()
    const error = validateStation(form)
    if (error) {
      setNotice(error)
      return
    }
    const prepared = schedules.map((item) => ({
      ...item,
      openingTime: clock(item.openingTime),
      closingTime: clock(item.closingTime),
    }))
    const invalid = prepared.find((item) => item.closingTime <= item.openingTime)
    if (invalid) {
      setNotice(`Closing time must be after opening time for ${invalid.day}.`)
      return
    }
    setLoading(true)
    try {
      const station = await stationsApi.create(toStationBody(form))
      for (const item of prepared) {
        await stationsApi.createSchedule(station.id, {
          day: item.day,
          openingTime: item.openingTime,
          closingTime: item.closingTime,
          isAvailable: item.isAvailable,
        })
      }
      navigate('/dashboard/stations')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link to="/dashboard/stations" className="inline-flex w-fit items-center gap-1 text-label-md font-semibold text-primary">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Stations
        </Link>
        <h1 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">
          Create station
        </h1>
        <p className="text-secondary">Register a new solar station and its weekly hours.</p>
      </div>

      {notice && (
        <div className="rounded-xl border-l-4 border-[#B91C1C] bg-surface-container-lowest px-4 py-3 text-[#B91C1C] shadow-sm">
          {notice}
        </div>
      )}

      <form className="flex flex-col gap-5 rounded-2xl bg-surface-container-lowest p-6 shadow-sm" onSubmit={handleCreate}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-label-md font-semibold">Station name</span>
            <input className={fieldClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-label-md font-semibold">Address</span>
            <input className={fieldClass} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label-md font-semibold">Latitude (-90 to 90)</span>
            <input className={fieldClass} type="number" step="any" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label-md font-semibold">Longitude (-180 to 180)</span>
            <input className={fieldClass} type="number" step="any" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label-md font-semibold">Capacity (kW)</span>
            <input className={fieldClass} type="number" step="any" min="0" value={form.capacityKw} onChange={(event) => setForm({ ...form, capacityKw: event.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label-md font-semibold">Battery slots</span>
            <input className={fieldClass} type="number" min="0" value={form.batteryStorageSlots} onChange={(event) => setForm({ ...form, batteryStorageSlots: event.target.value })} />
          </label>
        </div>
        <div className="flex flex-col gap-4 border-t border-outline-variant/20 pt-5">
          <div>
            <h2 className="flex items-center gap-2 font-headline-md text-headline-md font-semibold">
              <span className="material-symbols-outlined text-[22px] text-secondary">calendar_today</span>
              Weekly schedule
            </h2>
            <p className="text-secondary">Opening and closing hours saved with this station. Use edit to change a day.</p>
          </div>
          <div className="overflow-x-auto rounded-xl bg-surface-container-low">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container text-label-sm uppercase tracking-wider text-secondary">
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Opening</th>
                  <th className="px-4 py-3">Closing</th>
                  <th className="px-4 py-3">Available</th>
                  <th className="px-4 py-3 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {schedules.map((schedule) => {
                  const editing = editingDay === schedule.day
                  return (
                    <tr key={schedule.day}>
                      <td className="px-4 py-3 font-semibold">{schedule.day}</td>
                      <td className="px-4 py-3">
                        {editing ? (
                          <input
                            className={scheduleFieldClass}
                            aria-label={`${schedule.day} opening`}
                            value={schedule.openingTime}
                            onChange={(event) => updateSchedule(schedule.day, { openingTime: event.target.value })}
                          />
                        ) : (
                          clock(schedule.openingTime)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editing ? (
                          <input
                            className={scheduleFieldClass}
                            aria-label={`${schedule.day} closing`}
                            value={schedule.closingTime}
                            onChange={(event) => updateSchedule(schedule.day, { closingTime: event.target.value })}
                          />
                        ) : (
                          clock(schedule.closingTime)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editing ? (
                          <select
                            className={scheduleFieldClass}
                            aria-label={`${schedule.day} available`}
                            value={schedule.isAvailable ? 'yes' : 'no'}
                            onChange={(event) => updateSchedule(schedule.day, { isAvailable: event.target.value === 'yes' })}
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        ) : (
                          <span className={`rounded-full px-2.5 py-0.5 text-label-sm font-semibold ${schedule.isAvailable ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-surface-container text-secondary'}`}>
                            {schedule.isAvailable ? 'Yes' : 'No'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          aria-label={editing ? `Done editing ${schedule.day}` : `Edit ${schedule.day}`}
                          onClick={() => setEditingDay(editing ? '' : schedule.day)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-container text-on-primary-container"
                        >
                          <span className="material-symbols-outlined text-[18px]">{editing ? 'check' : 'edit'}</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-label-sm text-secondary">Closing time must be after opening time.</p>
        </div>
        <div className="flex justify-end gap-3">
          <Link to="/dashboard/stations" className="flex h-11 items-center rounded-lg bg-surface-container px-5 text-label-md">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 items-center gap-2 rounded-lg bg-primary-container px-6 text-label-md font-semibold text-on-primary-container"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create station
          </button>
        </div>
      </form>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { stationsApi } from '../../../api.js'

const shortcuts = [
  {
    to: '/dashboard/stations',
    icon: 'ev_station',
    title: 'Stations',
    text: 'View stations and update station details.',
  },
  {
    to: '/dashboard/weekly-schedule',
    icon: 'calendar_today',
    title: 'Schedule',
    text: 'Set opening and closing hours for a station.',
  },
  {
    to: '/dashboard/stations/create',
    icon: 'add',
    title: 'Create station',
    text: 'Add a new solar station with capacity and battery slots.',
  },
  {
    to: '/dashboard/slot-lookup',
    icon: 'search',
    title: 'Slot lookup',
    text: 'Look up one booking slot by its id.',
  },
  {
    to: '/reservations',
    icon: 'event_available',
    title: 'Reservations',
    text: 'Open reservation requests for the stations.',
  },
]

export default function DashboardPage() {
  const [stations, setStations] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    stationsApi
      .list()
      .then(setStations)
      .catch((loadError) => setError(loadError.message))
  }, [])

  const totalCapacity = stations.reduce((sum, station) => sum + Number(station.capacityKw || 0), 0)
  const totalSlots = stations.reduce((sum, station) => sum + Number(station.batteryStorageSlots || 0), 0)

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-1 border-b border-outline-variant/30 pb-2">
        <span className="w-fit rounded-full bg-primary-container px-2 py-0.5 text-label-sm font-semibold uppercase tracking-wide text-on-primary-container">
          BackOfficer Control
        </span>
        <h1 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">Dashboard</h1>
        <p className="text-secondary">Overview of stations, storage, and the station desk tools.</p>
      </div>

      {error && (
        <div className="rounded-xl border-l-4 border-[#B91C1C] bg-surface-container-lowest px-4 py-3 text-[#B91C1C] shadow-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#15803D]">
            <span className="material-symbols-outlined text-[22px]">ev_station</span>
          </div>
          <div className="flex flex-col">
            <span className="text-label-sm uppercase text-secondary">Stations</span>
            <span className="font-headline-md text-headline-md font-bold">{stations.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-primary">
            <span className="material-symbols-outlined text-[22px]">solar_power</span>
          </div>
          <div className="flex flex-col">
            <span className="text-label-sm uppercase text-secondary">Nominal output</span>
            <span className="font-headline-md text-headline-md font-bold">{totalCapacity} kW</span>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#15803D]">
            <span className="material-symbols-outlined text-[22px]">battery_charging_full</span>
          </div>
          <div className="flex flex-col">
            <span className="text-label-sm uppercase text-secondary">Battery slots</span>
            <span className="font-headline-md text-headline-md font-bold">{totalSlots}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {shortcuts.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-start gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-sm transition hover:bg-surface-container-low"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-headline-md text-headline-md font-semibold">{item.title}</span>
              <span className="text-secondary">{item.text}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

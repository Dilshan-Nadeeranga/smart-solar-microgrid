import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import App from './App.jsx'
import ReservationsModule from './features/reservations/ReservationsModule.jsx'
import SlotLookupPage from './features/stations/components/SlotLookupPage.jsx'
import CreateStationPage from './features/stations/components/CreateStationPage.jsx'
import DashboardPage from './features/stations/components/DashboardPage.jsx'
import StationsPage from './features/stations/components/StationsPage.jsx'
import WeeklySchedulePage from './features/stations/components/WeeklySchedulePage.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route path="/dashboard">
            <Route index element={<DashboardPage />} />
            <Route path="stations/create" element={<CreateStationPage />} />
            <Route path="stations" element={<StationsPage />} />
            <Route path="weekly-schedule" element={<WeeklySchedulePage />} />
            <Route path="slot-lookup" element={<SlotLookupPage />} />
          </Route>
          <Route path="/reservations/*" element={<ReservationsModule />} />
          <Route path="*" element={<Navigate to="/dashboard/stations" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

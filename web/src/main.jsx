import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import LoginPage from './auth/LoginPage'
import UserManagementPage from './features/users/UserManagementPage'
import PendingUsersPage from './features/users/PendingUsersPage'
import CreateProsumerPage from './features/users/CreateProsumerPage'
import CreateStaffPage from './features/users/CreateStaffPage'
import ProfilePage from './features/users/ProfilePage'
import App from './App.jsx'
import HomePage from './features/home/HomePage.jsx'
import ReservationsModule from './features/reservations/ReservationsModule.jsx'
import SlotLookupPage from './features/stations/components/SlotLookupPage.jsx'
import CreateStationPage from './features/stations/components/CreateStationPage.jsx'
import DashboardPage from './features/stations/components/DashboardPage.jsx'
import StationsPage from './features/stations/components/StationsPage.jsx'
import WeeklySchedulePage from './features/stations/components/WeeklySchedulePage.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<App />}>
              
              <Route element={<ProtectedRoute roles={['BACKOFFICE']} />}>
                <Route path="/dashboard/users">
                  <Route index element={<UserManagementPage />} />
                  <Route path="pending" element={<PendingUsersPage />} />
                  <Route path="create-prosumer" element={<CreateProsumerPage />} />
                  <Route path="create-staff" element={<CreateStaffPage />} />
                </Route>
              </Route>

              <Route path="/profile" element={<ProfilePage />} />

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
          </Route>
          
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)

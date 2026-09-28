import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'

const getLinks = (role) => {
  if (role === 'BACKOFFICE') {
    return [
      { to: '/dashboard/users', label: 'User Management', end: true },
      { to: '/dashboard/users/pending', label: 'Pending Activations', end: true },
      { to: '/dashboard/users/create-prosumer', label: 'Create Prosumer', end: true },
      { to: '/dashboard/users/create-staff', label: 'Create Staff', end: true },
      { to: '/bookings', label: 'Bookings', end: false },
      { to: '/profile', label: 'My Profile', end: true },
    ]
  }
  if (role === 'GRID_OPERATOR') {
    return [
      { to: '/dashboard', label: 'Dashboard', end: true },
      { to: '/dashboard/stations', label: 'Stations', end: false },
      { to: '/dashboard/weekly-schedule', label: 'Schedule', end: true },
      { to: '/dashboard/slot-lookup', label: 'Slot lookup', end: true },
      { to: '/bookings', label: 'Bookings', end: false },
      { to: '/profile', label: 'My Profile', end: true },
    ]
  }
  if (role === 'PROSUMER') {
    return [
      { to: '/reservations', label: 'Reservations', end: false },
      { to: '/profile', label: 'My Profile', end: true },
    ]
  }
  return [
    { to: '/dashboard', label: 'Dashboard', end: true },
    { to: '/dashboard/stations', label: 'Stations', end: false },
    { to: '/dashboard/weekly-schedule', label: 'Schedule', end: true },
    { to: '/dashboard/slot-lookup', label: 'Slot lookup', end: true },
    { to: '/reservations', label: 'Reservations', end: false },
  ]
}

const crumbs = {
  '/dashboard': 'Dashboard',
  '/dashboard/stations': 'Stations',
  '/dashboard/stations/create': 'Create station',
  '/dashboard/slot-lookup': 'Slot lookup',
  '/dashboard/users': 'User Management',
  '/dashboard/users/pending': 'Pending Activations',
  '/dashboard/users/create-prosumer': 'Create Prosumer',
  '/dashboard/users/create-staff': 'Create Staff',
  '/profile': 'My Profile',
}

function navClass(isActive) {
  return isActive
    ? 'flex items-center px-4 py-2.5 bg-surface-container text-on-surface font-semibold border-l-[3px] border-primary-container pl-[13px]'
    : 'flex items-center px-4 py-2.5 text-secondary hover:bg-surface-container-low hover:text-on-surface border-l-[3px] border-transparent'
}

export default function App() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Use dynamic links based on role, fallback to [] if user is null
  const links = user ? getLinks(user.role) : getLinks(null)

  return (
    <div className="min-h-screen bg-surface font-body-sm text-body-sm text-on-surface antialiased">
      <aside className="fixed left-0 top-0 hidden h-full w-60 flex-col justify-between border-r border-outline-variant/30 bg-surface-container-lowest py-6 lg:flex">
        <div className="flex flex-col gap-6">
          <Link to={user?.role === 'BACKOFFICE' ? '/dashboard/users' : '/dashboard/stations'} className="flex items-start gap-3 px-6">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-container shadow-sm">
              <span className="material-symbols-outlined text-[20px] text-on-primary-container">sunny</span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="mb-1 text-[10px] font-semibold uppercase leading-none tracking-wider text-secondary">
                Smart Solar Microgrid
              </span>
              <span className="truncate text-xl font-bold leading-tight text-on-surface">
                {user?.name || 'BackOfficer'}
              </span>
              <span className="text-[11px] font-medium text-secondary">
                {user?.role === 'BACKOFFICE' ? 'Administration' : 'Station Management'}
              </span>
            </div>
          </Link>
          <nav className="mt-4 flex flex-col gap-1">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => navClass(isActive)}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="border-t border-outline-variant/20 px-6 pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-primary-container" />
              <span className="text-label-sm text-secondary">{user?.role || 'Station desk'}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg bg-error/10 px-4 py-2 text-sm font-semibold text-error hover:bg-error/20 transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col bg-surface lg:pl-60">
        <header className="fixed top-0 right-0 left-0 z-40 flex h-14 items-center justify-between border-b border-outline-variant/20 bg-surface-container-lowest/80 px-4 backdrop-blur-md lg:left-60 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="hidden text-label-sm uppercase tracking-wider text-secondary sm:inline">
              Smart Solar Microgrid
            </span>
            <span className="hidden text-outline-variant sm:inline">/</span>
            <span className="text-label-md font-semibold text-on-surface">
              {pathname.startsWith('/reservations')
                ? 'Reservations'
                : pathname.startsWith('/bookings')
                  ? 'Bookings'
                  : crumbs[pathname] || 'Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold hidden sm:inline">{user?.name}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
            <button
              onClick={handleLogout}
              className="lg:hidden text-error font-semibold text-sm ml-2"
            >
              Logout
            </button>
          </div>
        </header>

        <nav className="fixed top-14 right-0 left-0 z-30 flex gap-1 overflow-x-auto border-b border-outline-variant/20 bg-surface-container-lowest px-3 py-2 lg:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive
                  ? 'shrink-0 rounded-lg bg-surface-container px-3 py-1.5 text-label-md font-semibold text-on-surface'
                  : 'shrink-0 rounded-lg px-3 py-1.5 text-label-md text-secondary'
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <main className="w-full flex-1 pt-28 lg:pt-14">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-8 lg:p-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}


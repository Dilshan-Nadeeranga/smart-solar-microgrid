import { NavLink, Outlet, useLocation } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/dashboard/stations', label: 'Stations', end: false },
  { to: '/dashboard/weekly-schedule', label: 'Schedule', end: true },
  { to: '/dashboard/slot-lookup', label: 'Slot lookup', end: true },
  { to: '/reservations', label: 'Reservations', end: false },
]

const crumbs = {
  '/dashboard': 'Dashboard',
  '/dashboard/stations': 'Stations',
  '/dashboard/stations/create': 'Create station',
  '/dashboard/weekly-schedule': 'Schedule',
  '/dashboard/slot-lookup': 'Slot lookup',
}

function navClass(isActive) {
  return isActive
    ? 'flex items-center px-4 py-2.5 bg-surface-container text-on-surface font-semibold border-l-[3px] border-primary-container pl-[13px]'
    : 'flex items-center px-4 py-2.5 text-secondary hover:bg-surface-container-low hover:text-on-surface border-l-[3px] border-transparent'
}

export default function App() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-surface font-body-sm text-body-sm text-on-surface antialiased">
      <aside className="fixed left-0 top-0 hidden h-full w-60 flex-col justify-between border-r border-outline-variant/30 bg-surface-container-lowest py-6 lg:flex">
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-3 px-6">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-container shadow-sm">
              <span className="material-symbols-outlined text-[20px] text-on-primary-container">sunny</span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="mb-1 text-[10px] font-semibold uppercase leading-none tracking-wider text-secondary">
                Smart Solar Microgrid
              </span>
              <span className="truncate text-xl font-bold leading-tight text-on-surface">BackOfficer</span>
              <span className="text-[11px] font-medium text-secondary">Station Management</span>
            </div>
          </div>
          <nav className="mt-4 flex flex-col gap-1">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => navClass(isActive)}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="border-t border-outline-variant/20 px-6 pt-4">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary-container" />
            <span className="text-label-sm text-secondary">Station desk</span>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col bg-surface lg:pl-60">
        <header className="fixed top-0 right-0 left-0 z-40 flex h-14 items-center justify-between border-b border-outline-variant/20 bg-surface-container-lowest/80 px-4 backdrop-blur-md lg:left-60 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="hidden text-label-sm uppercase tracking-wider text-secondary sm:inline">
              Infrastructure Module
            </span>
            <span className="hidden text-outline-variant sm:inline">/</span>
            <span className="text-label-md font-semibold text-on-surface">
              {pathname.startsWith('/reservations') ? 'Reservations' : crumbs[pathname] || 'BackOfficer Desk'}
            </span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <span className="material-symbols-outlined text-[18px] text-on-primary">person</span>
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

import { useEffect } from 'react'
import ReservationsModule from './features/reservations/ReservationsModule.jsx'
import { navigate, paths, useRoute } from './features/reservations/router.js'
import './App.css'

const NAV_ITEMS = [
  { label: 'Accounts', owner: 'Member 1' },
  { label: 'Stations', owner: 'Member 2' },
  { label: 'Reservations', owner: 'Member 3', active: true },
  { label: 'Monitoring', owner: 'Member 4' },
]

function PortalHome() {
  return (
    <section className="portal-home">
      <span className="portal-home__tag">Staff portal</span>
      <h1>Smart Solar Microgrid</h1>
      <p>Accounts, stations, reservations and monitoring for the campus solar grid.</p>
      <a
        className="portal-home__card"
        href={paths.home()}
        onClick={(event) => {
          event.preventDefault()
          navigate(paths.home())
        }}
      >
        <span className="portal-home__card-icon material-symbols-outlined" aria-hidden="true">
          event_available
        </span>
        <span className="portal-home__card-copy">
          <strong>Reservations</strong>
          <span>Book, change and cancel energy slots</span>
        </span>
        <span className="material-symbols-outlined" aria-hidden="true">
          arrow_forward
        </span>
      </a>
    </section>
  )
}

function App() {
  const route = useRoute()
  const onReservations = route.name !== 'outside'

  useEffect(() => {
    if (!onReservations) document.title = 'Smart Solar Microgrid'
  }, [onReservations])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <a
            className="app-brand"
            href="/"
            onClick={(event) => {
              event.preventDefault()
              navigate('/')
            }}
          >
            <span className="app-brand__mark">
              <span className="material-symbols-outlined" aria-hidden="true">
                wb_sunny
              </span>
            </span>
            <span className="app-brand__text">
              <strong>Smart Solar Microgrid</strong>
              <span>Staff portal</span>
            </span>
          </a>

          <nav className="app-nav" aria-label="Main">
            {NAV_ITEMS.map((item) =>
              item.active ? (
                <a
                  key={item.label}
                  href={paths.home()}
                  className={`app-nav__link${onReservations ? ' is-active' : ''}`}
                  aria-current={onReservations ? 'page' : undefined}
                  onClick={(event) => {
                    event.preventDefault()
                    navigate(paths.home())
                  }}
                >
                  {item.label}
                </a>
              ) : (
                <span
                  key={item.label}
                  className="app-nav__link is-disabled"
                  title={`${item.label} is built by ${item.owner}`}
                >
                  {item.label}
                </span>
              ),
            )}
          </nav>

          <div className="app-header__end">
            <span className="app-mode">
              <span className="app-mode__dot" aria-hidden="true" />
              Mock data mode
            </span>
            <div className="app-user">
              <span className="app-user__text">
                <strong>Staff user</strong>
                <span>Grid Operator</span>
              </span>
              <span className="app-user__avatar">GO</span>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {onReservations ? <ReservationsModule /> : <PortalHome />}
      </main>

      <footer className="app-footer">
        <div className="app-footer__inner">
          <span>© 2026 Smart Solar Microgrid</span>
          <span>{onReservations ? 'Reservation management · Member 3' : 'Staff portal'}</span>
        </div>
      </footer>
    </div>
  )
}

export default App

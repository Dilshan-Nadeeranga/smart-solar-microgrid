import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const NAV = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#features', label: 'Features' },
  { href: '#mobile-app', label: 'Mobile App' },
  { href: '#about', label: 'About' },
]

const STATS = [
  { label: 'Active Nodes', value: '18', note: 'Western Province grid', noteClass: 'text-teal-700' },
  { label: 'Solar Prosumers', value: '1,400+', note: 'Verified infeeders', noteClass: 'text-secondary' },
  { label: 'Reliability Rate', value: '99.8%', note: 'Zero injection faults', noteClass: 'text-teal-700' },
  { label: 'Available Slots', value: '320', note: 'Open today across nodes', noteClass: 'text-secondary', valueClass: 'text-primary' },
]

const STEPS = [
  { n: '01', title: 'Register', body: 'Connect in minutes via the mobile app using Sri Lankan NIC and verified CEB meter credentials.', icon: 'verified', foot: 'KYC & Meter Check' },
  { n: '02', title: 'Reserve Slot', body: 'Select nearby microgrid substations and lock in an optimal energy feed window up to 7 days ahead.', icon: 'calendar_today', foot: '7-Day Forecasting' },
  { n: '03', title: 'Get QR Pass', body: 'Receive a cryptographically signed one-time dispatch QR code instantly validated by grid automation.', icon: 'lock', foot: 'Encrypted Token', iconClass: 'text-teal-600' },
  { n: '04', title: 'Transfer Energy', body: 'Authenticate transfer at the node terminal for seamless metered injection and automated CEB accounting.', icon: 'check_circle', foot: 'Automated Settlement', iconClass: 'text-teal-600' },
]

const ROLES = [
  {
    icon: 'smartphone',
    tone: 'bg-primary-container/20 text-primary border-primary-container/50',
    check: 'text-primary',
    title: 'Solar Prosumers',
    body: 'Residential solar system owners looking to reserve feed-in slots, monitor kW output, and earn energy credits easily via Android.',
    points: ['Simple 1-click slot booking', 'Dynamic secure QR pass', 'Battery SoC and infeed tracking'],
    link: { href: '#mobile-app', label: 'Download Mobile App', className: 'text-primary' },
  },
  {
    icon: 'terminal',
    tone: 'bg-blue-50 text-blue-700 border-blue-200',
    check: 'text-blue-600',
    title: 'Grid Operators',
    body: 'Field engineers and substation staff monitoring live feeder balancing, battery reserves, and physical QR authentications.',
    points: ['QR pass terminal scanning', 'Real-time frequency monitoring', 'Capacity throttling controls'],
    link: { to: '/dashboard', label: 'Operator Terminal', className: 'text-blue-700' },
  },
  {
    icon: 'shield_person',
    tone: 'bg-teal-50 text-teal-700 border-teal-200',
    check: 'text-teal-600',
    title: 'System Admin',
    body: 'Backoffice governance overseeing user KYC approvals, meter bindings, substation provisioning, and audit reporting.',
    points: ['User verification & KYC', 'Substation capacity quotas', 'Immutable audit event logs'],
    link: { to: '/dashboard', label: 'Admin Console', className: 'text-teal-700' },
  },
]

const FEATURES = [
  { icon: 'lock', tone: 'bg-primary-container/20 text-primary border-primary-container/40', title: 'Role-Based Access', body: 'Secure JWT authentication paired with granular access policies safeguards substation terminals and prosumer telemetry.' },
  { icon: 'bolt', tone: 'bg-teal-50 text-teal-700 border-teal-200', title: 'Real-Time Balancing', body: 'Dynamic algorithms continuously monitor BESS headroom and grid frequency to allocate injection capacity smoothly.' },
  { icon: 'calendar_month', tone: 'bg-blue-50 text-blue-700 border-blue-200', title: 'Flexible Reservations', body: 'Book infeed slots up to 7 days in advance with transparent 12-hour penalty-free slot reallocations.' },
  { icon: 'qr_code_2', tone: 'bg-primary-container/20 text-primary border-primary-container/40', title: 'Cryptographic Verification', body: 'One-time signed QR codes ensure phantom injections are impossible and only approved energy enters the grid.' },
  { icon: 'near_me', tone: 'bg-teal-50 text-teal-700 border-teal-200', title: 'Substation Discovery', body: 'Geolocation routing directs prosumers to the closest low-impedance node with live transformer capacity ratings.' },
  { icon: 'analytics', tone: 'bg-blue-50 text-blue-700 border-blue-200', title: 'Yield & Settlement Reports', body: 'Comprehensive audit logs, kW output records, and export settlement ledgers available instantly for reporting.' },
]

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

function Mark({ className = 'h-8 w-8' }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-lg bg-primary-container text-on-primary-container shadow-sm ${className}`}>
      <Icon name="sunny" className="text-[20px]" />
    </span>
  )
}

function RoleLink({ link }) {
  const className = `flex items-center gap-1.5 text-sm font-bold hover:brightness-90 ${link.className}`
  const content = (
    <>
      {link.label}
      <Icon name="arrow_forward" className="text-[16px]" />
    </>
  )
  if (link.to) {
    return (
      <Link to={link.to} className={className}>
        {content}
      </Link>
    )
  }
  return (
    <a href={link.href} className={className}>
      {content}
    </a>
  )
}

export default function HomePage() {
  useEffect(() => {
    document.title = 'Solarix · Smart Solar Microgrid'
  }, [])

  return (
    <div className="home-page relative min-h-screen overflow-x-hidden bg-surface text-on-surface antialiased selection:bg-primary-container/40 selection:text-primary">
      <div className="pointer-events-none fixed top-0 left-1/4 -z-10 h-[600px] w-[600px] rounded-full bg-teal-200/25 blur-[140px]" />
      <div className="pointer-events-none fixed top-1/3 right-0 -z-10 h-[550px] w-[550px] rounded-full bg-primary-container/30 blur-[160px]" />
      <div className="pointer-events-none fixed bottom-10 left-10 -z-10 h-[500px] w-[500px] rounded-full bg-blue-200/25 blur-[150px]" />

      <header className="fixed top-0 left-0 z-50 w-full border-b border-outline-variant/40 bg-surface-container-lowest/90 shadow-[0_4px_24px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 lg:px-10">
          <Link to="/" className="flex items-center gap-3">
            <Mark />
            <span className="text-[20px] font-extrabold tracking-tight text-on-surface">Solarix</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="text-[15px] font-medium text-secondary transition-colors hover:text-on-surface">
                {item.label}
              </a>
            ))}
          </nav>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-full bg-primary-container px-6 py-2.5 text-[13px] font-bold text-on-surface shadow-sm transition hover:brightness-105"
          >
            Launch App
          </Link>
        </div>
      </header>

      <main className="w-full bg-surface pt-20">
        <section className="relative w-full overflow-hidden border-b border-outline-variant/40 bg-gradient-to-b from-surface-container-low via-surface to-surface pt-16 pb-20">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-5 pt-12 lg:grid-cols-12 lg:px-10">
            <div className="flex flex-col gap-6 lg:col-span-7">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-outline-variant/50 bg-surface-container-lowest px-4 py-1.5 text-xs font-semibold text-secondary shadow-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-teal-500" />
                <span>Decentralized Microgrid Platform</span>
                <span className="text-outline-variant">•</span>
                <span className="font-bold text-primary">Sri Lanka Clean Energy</span>
              </div>
              <h1 className="text-[44px] leading-tight font-extrabold tracking-tight text-on-surface md:text-[54px]">
                Trade Solar Energy.
                <br />
                <span className="text-primary">Power the Community.</span>
              </h1>
              <p className="max-w-xl text-[17px] leading-relaxed text-secondary">
                Connect residential solar rooftop prosumers with smart microgrid nodes to reserve capacity, transfer clean power, and settle energy verified in real time.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="#mobile-app"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-container px-8 py-3.5 text-[14px] font-semibold text-on-surface shadow-md transition hover:shadow-lg hover:brightness-105"
                >
                  Get Started
                  <Icon name="arrow_forward" className="text-[18px]" />
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant/70 bg-surface-container-lowest px-7 py-3.5 text-[14px] font-semibold text-on-surface shadow-sm transition hover:bg-surface-container-low"
                >
                  Learn More
                </a>
              </div>
              <div className="flex items-center gap-2 pt-2 text-xs text-secondary">
                <Icon name="verified" className="text-[16px] text-primary" />
                <span>SLIIT SE4040 Capstone Artifact · Utility Synchronized Architecture</span>
              </div>
            </div>

            <div className="flex justify-center lg:col-span-5">
              <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-md">
                <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-teal-500" />
                    <span className="text-xs font-bold tracking-wider text-on-surface uppercase">Live Grid Telemetry</span>
                  </div>
                  <span className="rounded-full border border-primary-container/60 bg-primary-container/20 px-2.5 py-1 text-xs font-semibold text-primary">
                    Node 07 Malabe
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                    <span className="text-xs font-medium text-secondary">Active Infeed</span>
                    <span className="mt-1 text-2xl font-extrabold text-on-surface">
                      348.6 <span className="text-xs font-normal text-secondary">kW</span>
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-teal-600">
                      <Icon name="trending_up" className="text-[14px]" /> +14.2% peak
                    </span>
                  </div>
                  <div className="flex flex-col rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                    <span className="text-xs font-medium text-secondary">Battery SOC</span>
                    <span className="mt-1 text-2xl font-extrabold text-on-surface">
                      88.4 <span className="text-xs font-normal text-secondary">%</span>
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-blue-600">
                      <Icon name="sync" className="text-[14px]" /> Optimal
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-primary-container/50 bg-primary-container/15 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary-container/50 bg-surface-container-lowest text-primary">
                      <Icon name="solar_power" className="text-[20px]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-on-surface">Next Dispatch Window</span>
                      <span className="text-xs text-secondary">11:00 AM · 45 kWh Reserved</span>
                    </div>
                  </div>
                  <span className="rounded bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-800">READY</span>
                </div>
                <div className="flex items-center justify-between pt-1 text-xs text-secondary">
                  <span className="flex items-center gap-1">
                    <Icon name="speed" className="text-[14px] text-primary" /> Grid Freq: <strong className="text-on-surface">50.02 Hz</strong>
                  </span>
                  <span>Last updated: 5s ago</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full border-b border-outline-variant/40 bg-surface-container-lowest py-10">
          <div className="mx-auto max-w-7xl px-5 lg:px-10">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:divide-x md:divide-outline-variant/30">
              {STATS.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center md:items-start md:px-6">
                  <span className="text-xs font-semibold tracking-wider text-secondary uppercase">{stat.label}</span>
                  <span className={`mt-1 text-3xl font-extrabold ${stat.valueClass || 'text-on-surface'}`}>{stat.value}</span>
                  <span className={`mt-0.5 text-xs font-medium ${stat.noteClass}`}>{stat.note}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="w-full bg-surface py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-10">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <span className="rounded-full border border-primary-container/50 bg-primary-container/20 px-3 py-1 text-xs font-bold tracking-wider text-primary uppercase">
                Simple Process
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-on-surface">How Solarix Works</h2>
              <p className="mt-2 text-base text-secondary">Four straightforward steps to monetize rooftop solar power and balance neighborhood grid loads.</p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step) => (
                <div key={step.n} className="flex flex-col justify-between rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-container/50 bg-primary-container/20 text-sm font-extrabold text-primary">
                      {step.n}
                    </div>
                    <h3 className="text-lg font-bold text-on-surface">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-secondary">{step.body}</p>
                  </div>
                  <div className="mt-6 flex items-center gap-1.5 border-t border-outline-variant/30 pt-3 text-xs font-medium text-secondary">
                    <Icon name={step.icon} className={`text-[16px] ${step.iconClass || 'text-primary'}`} />
                    {step.foot}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full border-t border-outline-variant/40 bg-surface-container-lowest py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-10">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <span className="rounded-full border border-primary-container/50 bg-primary-container/20 px-3 py-1 text-xs font-bold tracking-wider text-primary uppercase">
                Ecosystem
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-on-surface">Tailored for Every Stakeholder</h2>
              <p className="mt-2 text-base text-secondary">Purpose-built interfaces ensure simple workflows for producers, grid operators, and administrators.</p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {ROLES.map((role) => (
                <div key={role.title} className="flex flex-col justify-between rounded-2xl border border-outline-variant/40 bg-surface p-8 shadow-sm">
                  <div className="flex flex-col gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${role.tone}`}>
                      <Icon name={role.icon} className="text-[26px]" />
                    </div>
                    <h3 className="text-xl font-bold text-on-surface">{role.title}</h3>
                    <p className="text-sm leading-relaxed text-secondary">{role.body}</p>
                    <ul className="flex flex-col gap-2 pt-2 text-sm text-on-surface">
                      {role.points.map((point) => (
                        <li key={point} className="flex items-center gap-2">
                          <Icon name="check" className={`text-[18px] ${role.check}`} />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4 border-t border-outline-variant/40 pt-6">
                    <RoleLink link={role.link} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="w-full bg-surface py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-10">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <span className="rounded-full border border-primary-container/50 bg-primary-container/20 px-3 py-1 text-xs font-bold tracking-wider text-primary uppercase">
                Capabilities
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-on-surface">Core Platform Features</h2>
              <p className="mt-2 text-base text-secondary">Designed for high availability, cryptographic verification, and intelligent load coordination.</p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex flex-col gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${feature.tone}`}>
                    <Icon name={feature.icon} className="text-[22px]" />
                  </div>
                  <h3 className="text-lg font-bold text-on-surface">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-secondary">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="mobile-app" className="w-full border-y border-outline-variant/40 bg-gradient-to-b from-surface-container-low to-surface-container-lowest py-20">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 lg:grid-cols-12 lg:px-10">
            <div className="flex flex-col gap-6 lg:col-span-6">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary-container/50 bg-primary-container/20 px-3.5 py-1 text-xs font-bold text-primary">
                <Icon name="smartphone" className="text-[16px]" />
                Android Client Application
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">Manage Solar Infeeds on the Go</h2>
              <p className="text-base leading-relaxed text-secondary">
                The Solarix Android app empowers solar home owners to reserve injection slots, track real-time yields, and present verified QR dispatch passes right at the substation terminal.
              </p>
              <div className="flex flex-col gap-3 pt-2">
                {['Instant CEB-accredited infeed slot reservations', 'Encrypted QR dispatch ticket updated for slot window', 'Real-time inverter kW output & battery SoC monitoring'].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-container/30 text-xs font-bold text-primary">✓</span>
                    <span className="text-sm font-medium text-on-surface">{item}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Link
                  to="/reservations"
                  className="inline-flex items-center gap-3 rounded-full bg-primary-container px-8 py-3.5 text-sm font-bold text-on-surface shadow-md transition hover:shadow-lg"
                >
                  <Icon name="android" className="text-[22px]" />
                  <span className="flex flex-col text-left">
                    <span className="text-[10px] leading-3 font-semibold tracking-wider uppercase">Reservations</span>
                    <span className="text-sm font-bold">Book an energy slot</span>
                  </span>
                </Link>
                <div className="flex flex-col text-xs text-secondary">
                  <span className="font-bold text-on-surface">Staff portal</span>
                  <span>Web booking uses the same rules as Android</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center lg:col-span-6">
              <div
                className="w-[280px] shrink-0 rounded-[40px] bg-on-surface p-2.5 shadow-2xl"
                aria-hidden="true"
              >
                <div className="relative flex h-[580px] flex-col overflow-hidden rounded-[32px] bg-surface-container-lowest">
                  <div className="absolute top-2 left-1/2 h-5 w-[92px] -translate-x-1/2 rounded-full bg-on-surface" />
                  <div className="flex items-center justify-between px-5 pt-3 text-[11px] font-semibold text-secondary">
                    <span>11:02</span>
                    <span className="flex items-center gap-1">
                      <Icon name="wifi" className="text-[13px]" />
                      <Icon name="battery_5_bar" className="text-[13px]" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-b border-outline-variant/30 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-container/30 text-primary">
                        <Icon name="solar_power" className="text-[14px]" />
                      </div>
                      <span className="text-xs font-bold text-on-surface">Solarix Mobile</span>
                    </div>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-teal-500" />
                  </div>
                  <div className="flex items-center gap-2.5 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-container/50 bg-primary-container/20 text-xs font-bold text-primary">
                      KJ
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-on-surface">Kasun Jayasuriya</span>
                      <span className="text-[10px] text-secondary">NIC: 199423801294</span>
                    </div>
                  </div>
                  <div className="mx-3 flex flex-col gap-2 rounded-xl border border-primary-container/40 bg-primary-container/15 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-primary uppercase">Active Infeed Pass</span>
                      <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold text-teal-800">VALID</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-bold text-on-surface">11:00 AM - 12:00 PM</span>
                      <span className="text-xs font-extrabold text-primary">45.0 kWh</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-2.5">
                      <Icon name="qr_code_2" className="text-[96px] text-on-surface" />
                      <span className="font-mono text-[9px] font-bold tracking-widest text-primary uppercase">TOKEN: 7F4A-981C</span>
                    </div>
                  </div>
                  <div className="mt-auto flex justify-center pb-2">
                    <span className="h-1 w-24 rounded-full bg-outline-variant/70" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="w-full bg-surface py-16">
          <div className="mx-auto max-w-7xl px-5 lg:px-10">
            <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-8 shadow-sm md:p-12">
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
                <div className="flex flex-col gap-3 lg:col-span-7">
                  <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-primary uppercase">
                    <Icon name="school" className="text-[16px]" />
                    Sri Lanka Institute of Information Technology (SLIIT)
                  </div>
                  <h3 className="text-2xl font-bold text-on-surface">SE4040 Enterprise Application Development</h3>
                  <p className="text-sm leading-relaxed text-secondary">
                    Solarix is engineered as a graduation capstone research prototype demonstrating peer-to-peer microgrid load management, distributed telemetry ingestion, and cryptographically verified energy distribution.
                  </p>
                  <div className="flex flex-wrap gap-4 pt-2 text-xs font-medium text-secondary">
                    <span>Faculty of Computing · Software Engineering</span>
                    <span className="text-outline-variant">•</span>
                    <span>Academic Year 2026</span>
                  </div>
                </div>
                <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-6 lg:col-span-5">
                  <span className="mb-3 block text-xs font-bold tracking-wider text-on-surface uppercase">Development Team (Group 2026-SE-44)</span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      ['Kasun J.', 'Team Lead & System Architect'],
                      ['P. Alwis', 'Microgrid Infrastructure'],
                      ['D. Perera', 'Backend Microservices'],
                      ['T. Silva', 'Frontend & Telemetry UI'],
                    ].map(([name, role]) => (
                      <div key={name} className="flex flex-col">
                        <span className="font-bold text-on-surface">{name}</span>
                        <span className="text-secondary">{role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-outline-variant/40 bg-surface-container-lowest py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 md:flex-row lg:px-10">
          <div className="flex items-center gap-3">
            <Mark className="h-7 w-7" />
            <span className="font-extrabold text-on-surface">Solarix</span>
            <span className="text-outline-variant">|</span>
            <span className="text-xs text-secondary">Decentralized Solar Microgrid Architecture</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-secondary">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-on-surface">
                {item.label}
              </a>
            ))}
          </div>
          <div className="text-xs text-secondary">© 2026 Solarix · SLIIT SE4040 Capstone Project</div>
        </div>
      </footer>
    </div>
  )
}

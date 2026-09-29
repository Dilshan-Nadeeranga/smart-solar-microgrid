import { smallCapsClass } from './styles'

/** Page section with a small-caps heading. */
export default function Section({ id, label, children }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className={smallCapsClass}>
        {label}
      </h2>
      {children}
    </section>
  )
}

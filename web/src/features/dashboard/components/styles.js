export { focusRing } from '../../bookings/components/styles'

/** White surface, 1px warm border, 16px radius, no shadow. */
export const cardClass = 'rounded-2xl border border-(--dash-border) bg-(--dash-surface)'

/** 12px / 700 / 0.08em uppercase label in the tertiary color. */
export const smallCapsClass = 'text-[12px] font-bold uppercase tracking-[0.08em] text-(--dash-text-3)'

/** Row of equal-width cards that stacks to one column below 900px. */
export const cardRowClass = 'flex flex-col gap-5 min-[900px]:flex-row [&>*]:min-w-0 [&>*]:flex-1'

const numberFormat = new Intl.NumberFormat('en-US')
export const formatCount = (value) => numberFormat.format(value)

/** Full class names so Tailwind can see them. */
export const tones = {
  amber: { text: 'text-(--dash-amber)', badge: 'bg-(--dash-amber-bg) text-(--dash-amber)' },
  orange: { text: 'text-(--dash-orange)', badge: 'bg-(--dash-orange-bg) text-(--dash-orange)' },
  blue: { text: 'text-(--dash-blue)', badge: 'bg-(--dash-blue-bg) text-(--dash-blue)' },
  green: { text: 'text-(--dash-green)', badge: 'bg-(--dash-green-bg) text-(--dash-green)' },
  neutral: { text: 'text-(--dash-text-2)', badge: 'bg-(--dash-neutral-bg) text-(--dash-text-2)' },
}

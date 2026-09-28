export const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const buttonBase = `inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`

export const buttonSizes = {
  sm: 'min-h-8 px-3 py-1.5 text-xs',
  md: 'min-h-10 px-4 py-2 text-sm',
}

export const buttonVariants = {
  primary: `${buttonBase} bg-primary text-on-primary hover:bg-primary/90`,
  approve: `${buttonBase} bg-emerald-700 text-white hover:bg-emerald-800`,
  reject: `${buttonBase} border border-red-700 bg-surface-container-lowest text-red-700 hover:bg-red-50`,
  danger: `${buttonBase} bg-red-700 text-white hover:bg-red-800`,
  secondary: `${buttonBase} border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low`,
  ghost: `${buttonBase} text-secondary hover:bg-surface-container-low hover:text-on-surface`,
}

export const cardClass = 'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm'

export const inputClass = `min-h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-secondary/80 ${focusRing}`

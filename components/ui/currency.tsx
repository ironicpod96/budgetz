'use client'

interface RmProps {
  amount: number
  /** Show 2 decimal places (default: 0) */
  decimals?: boolean
  /** Extra classes applied to the RM label span */
  rmClassName?: string
  /** Extra classes applied to the numeric value span */
  valueClassName?: string
}

/**
 * Renders a currency amount as:
 *   <RM secondary-colored> <value>
 * Both RM and value inherit font size from the parent so they stay the same size.
 */
export function Rm({ amount, decimals = false, rmClassName, valueClassName }: RmProps) {
  const formatted = Math.abs(amount).toLocaleString('en-MY', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })
  return (
    <>
      <span className={rmClassName ?? 'text-muted-foreground'}>RM</span>
      {' '}
      <span className={valueClassName}>{formatted}</span>
    </>
  )
}

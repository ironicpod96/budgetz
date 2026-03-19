'use client'

import { Rm } from '@/components/ui/currency'

/** Pick a font size that keeps "RM X,XXX" fitting inside the ring */
function getFontSize(amount: number): string {
  const chars = Math.abs(amount).toLocaleString('en-MY', { maximumFractionDigits: 0 }).length + 3 // +3 for "RM "
  if (chars <= 5) return '2.5rem'     // e.g. RM 9
  if (chars <= 6) return '2.25rem'    // e.g. RM 99
  if (chars <= 7) return '2rem'       // e.g. RM 999
  if (chars <= 9) return '1.75rem'    // e.g. RM 9,999
  return '1.5rem'                     // e.g. RM 99,999+
}

interface BudgetRingProps {
  budget: number
  spent: number
  remaining: number
}

export function BudgetRing({ budget, spent, remaining }: BudgetRingProps) {
  const spentRatio = budget > 0 ? Math.min(Math.max(spent / budget, 0), 1) : 1
  const remainingRatio = Math.max(1 - spentRatio, 0)
  const isOverBudget = spent > budget

  // When over budget, show a fully filled circle; otherwise show progress
  const visiblePercentage = isOverBudget
    ? 100
    : Math.min(Math.max(remainingRatio * 100, 3), 100)

  // SVG parameters
  const size = 200
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (visiblePercentage / 100) * circumference
  let progressStroke: string
  if (isOverBudget) {
    progressStroke = 'var(--destructive)'
  } else {
    const colorRatio = Math.min(spentRatio, 1)

    if (colorRatio <= 0.35) {
      progressStroke = 'white'
    } else if (colorRatio <= 0.5) {
      const normalized = (colorRatio - 0.35) / (0.5 - 0.35)
      const orangeMix = normalized * 100
      progressStroke = `color-mix(in oklab, white ${100 - orangeMix}%, var(--chart-4) ${orangeMix}%)`
    } else if (colorRatio <= 0.6) {
      progressStroke = 'var(--chart-4)'
    } else if (colorRatio <= 0.75) {
      const redMix = ((colorRatio - 0.6) / (0.75 - 0.6)) * 100
      progressStroke = `color-mix(in oklab, var(--chart-4) ${100 - redMix}%, var(--destructive) ${redMix}%)`
    } else {
      progressStroke = 'var(--destructive)'
    }
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary"
        />

        {/* Light red fill when over budget */}
        {isOverBudget && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - strokeWidth / 2}
            fill="color-mix(in oklab, var(--destructive) 20%, transparent)"
          />
        )}
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressStroke}
          strokeWidth={strokeWidth}
          strokeLinecap={isOverBudget ? 'butt' : 'round'}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      {/* Center text – shrinks dynamically to fit inside the ring */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
        <div className="font-bold tabular-nums leading-tight" style={{ fontSize: getFontSize(isOverBudget ? spent - budget : remaining) }}>
          <Rm amount={isOverBudget ? spent - budget : remaining} rmClassName={isOverBudget ? 'text-destructive' : 'text-foreground'} valueClassName={isOverBudget ? 'text-destructive' : 'text-foreground'} />
        </div>
        <span className={`text-xl mt-0.5 leading-tight ${isOverBudget ? 'text-destructive' : 'text-muted-foreground'}`}>
          {isOverBudget ? 'over budget' : 'remaining'}
        </span>
      </div>
    </div>
  )
}

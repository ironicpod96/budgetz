'use client'

import { useMemo } from 'react'
import { CategoryLabel } from '@/components/category-label'
import { Rm } from '@/components/ui/currency'
import type { BudgetCategory } from '@/lib/types'

interface CategoryWithSpending extends BudgetCategory {
  periodBudget: number
  spent: number
  remaining: number
  percentage: number
}

interface CategoryBarsProps {
  categories: CategoryWithSpending[]
  isExpanded: boolean
  acknowledged?: boolean
}

export function CategoryBars({ categories, isExpanded, acknowledged = false }: CategoryBarsProps) {
  if (categories.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-4">
        No budget categories set
      </p>
    )
  }

  const displayCategories = useMemo(
    () => categories.filter(c => c.periodBudget > 0),
    [categories]
  )

  return (
    <div className="space-y-3">
      {isExpanded && (
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-3">
          {displayCategories.map(category => (
            <CategoryRow key={category.id} category={category} acknowledged={acknowledged} />
          ))}
        </div>
      )}
    </div>
  )
}

export function getBarColor(percentage: number): string {
  const spentRatio = Math.min(Math.max(percentage, 0) / 100, 1)
  const isOverBudget = percentage > 100
  if (isOverBudget) return 'var(--destructive)'
  const colorRatio = Math.min(spentRatio, 1)
  if (colorRatio <= 0.35) return 'var(--category-ring-base)'
  if (colorRatio <= 0.5) {
    const normalized = (colorRatio - 0.35) / (0.5 - 0.35)
    const orangeMix = normalized * 100
    return `color-mix(in oklab, var(--category-ring-base) ${100 - orangeMix}%, var(--chart-4) ${orangeMix}%)`
  }
  if (colorRatio <= 0.6) return 'var(--chart-4)'
  if (colorRatio <= 0.75) {
    const redMix = ((colorRatio - 0.6) / (0.75 - 0.6)) * 100
    return `color-mix(in oklab, var(--chart-4) ${100 - redMix}%, var(--destructive) ${redMix}%)`
  }
  return 'var(--destructive)'
}

function CategoryRow({ category, acknowledged }: { category: CategoryWithSpending; acknowledged: boolean }) {
  const spentRatio = Math.min(Math.max(category.percentage, 0) / 100, 1)
  const isOverBudget = category.percentage > 100
  const overAmount = category.spent - Number(category.periodBudget)

  // Bar shows remaining — starts full, depletes as spending increases
  const remainingPercent = isOverBudget ? 100 : Math.max(100 - category.percentage, 2)

  const barColor = getBarColor(category.percentage)
  const dimmed = acknowledged && isOverBudget

  return (
    <>
      {/* Icon + Name */}
      <CategoryLabel
        name={category.name}
        icon={category.icon}
        size="md"
        textClassName="font-semibold"
        noTruncate
        className={dimmed ? 'opacity-50' : ''}
      />

      {/* Progress Bar — depletes from right to left as budget is spent */}
      <div className={`h-2.5 bg-secondary rounded-full overflow-hidden ${dimmed ? 'opacity-50' : ''}`}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${remainingPercent}%`,
            backgroundColor: barColor,
          }}
        />
      </div>

      {/* Category remaining/over budget value */}
      <span 
        className={`text-base font-semibold whitespace-nowrap w-[48px] text-right ${dimmed ? 'opacity-50' : ''}`}
        style={{ color: barColor }}
      >
        {isOverBudget && '+'}<Rm amount={isOverBudget ? overAmount : category.remaining} rmClassName="text-current" valueClassName="text-current" />
      </span>
    </>
  )
}

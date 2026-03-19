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
}

export function CategoryBars({ categories, isExpanded }: CategoryBarsProps) {
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
        <div className="space-y-3">
          {displayCategories.map(category => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </div>
      )}
    </div>
  )
}

function CategoryRow({ category }: { category: CategoryWithSpending }) {
  const spentRatio = Math.min(Math.max(category.percentage, 0) / 100, 1)
  const isOverBudget = category.percentage > 100
  const overAmount = category.spent - Number(category.periodBudget)

  // Bar shows remaining — starts full, depletes as spending increases
  const remainingPercent = isOverBudget ? 100 : Math.max(100 - category.percentage, 2)

  // Color follows the spent ratio: grey → orange → red as it depletes
  let barColor: string
  if (isOverBudget) {
    barColor = 'var(--destructive)'
  } else {
    const colorRatio = Math.min(spentRatio, 1)
    if (colorRatio <= 0.35) {
      barColor = 'var(--category-ring-base)'
    } else if (colorRatio <= 0.5) {
      const normalized = (colorRatio - 0.35) / (0.5 - 0.35)
      const orangeMix = normalized * 100
      barColor = `color-mix(in oklab, var(--category-ring-base) ${100 - orangeMix}%, var(--chart-4) ${orangeMix}%)`
    } else if (colorRatio <= 0.6) {
      barColor = 'var(--chart-4)'
    } else if (colorRatio <= 0.75) {
      const redMix = ((colorRatio - 0.6) / (0.75 - 0.6)) * 100
      barColor = `color-mix(in oklab, var(--chart-4) ${100 - redMix}%, var(--destructive) ${redMix}%)`
    } else {
      barColor = 'var(--destructive)'
    }
  }

  return (
    <div className="flex items-center gap-3 justify-start">
      {/* Icon + Name */}
      <CategoryLabel
        name={category.name}
        icon={category.icon}
        size="sm"
        className="w-20 shrink-0"
      />

      {/* Progress Bar — depletes from right to left as budget is spent */}
      <div className="w-[164px] h-2.5 bg-secondary rounded-full overflow-hidden shrink-0">
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
        className="text-base font-semibold whitespace-nowrap shrink-0"
        style={{ color: barColor }}
      >
        {isOverBudget && '+'}<Rm amount={isOverBudget ? overAmount : category.remaining} rmClassName="text-current" valueClassName="text-current" />
      </span>
    </div>
  )
}

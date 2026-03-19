'use client'

import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/types'
import type { BudgetCategory } from '@/lib/types'

interface CategoryWithSpending extends BudgetCategory {
  spent: number
  remaining: number
  percentage: number
}

interface CategoryBarsProps {
  categories: CategoryWithSpending[]
}

export function CategoryBars({ categories }: CategoryBarsProps) {
  if (categories.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-4">
        No budget categories set
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {categories.slice(0, 6).map((category, index) => {
        const isOverBudget = category.percentage > 100
        const overAmount = category.spent - Number(category.budget_amount)

        return (
          <div key={category.id} className="flex items-center gap-4">
            {/* Category name */}
            <span className="w-24 text-sm text-muted-foreground truncate">
              {category.name}
            </span>

            {/* Progress bar */}
            <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundColor: isOverBudget ? 'var(--destructive)' : (category.color || 'var(--muted-foreground)'),
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(category.percentage, 100)}%` }}
                transition={{ 
                  delay: index * 0.05, 
                  duration: 0.5, 
                  ease: [0.4, 0, 0.2, 1] 
                }}
              />
            </div>

            {/* Over budget indicator */}
            {isOverBudget && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs text-destructive font-medium whitespace-nowrap"
              >
                +{formatCurrency(overAmount)}
              </motion.span>
            )}
          </div>
        )
      })}
    </div>
  )
}

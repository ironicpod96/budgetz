'use client'

import { useState } from 'react'
import { CategoryIcon } from '@/components/category-icon'
import { Rm } from '@/components/ui/currency'
import { getBarColor } from './category-bars'
import { useBudget } from '@/lib/budget-context'
import type { BudgetCategory } from '@/lib/types'
import type { Transaction } from '@/lib/types'

interface CategoryWithSpending extends BudgetCategory {
  periodBudget: number
  spent: number
  remaining: number
  percentage: number
}

interface BorrowSheetProps {
  open: boolean
  onClose: () => void
  onAcknowledge: () => void
  overCategories: CategoryWithSpending[]
  currentDailyBudget: number
  remainingDaysInMonth: number
  totalMonthlyBudget: number
  spentBeforeToday: number
  todaySpent: number
  lastTransaction: Transaction | null
}

export function BorrowSheet({
  open,
  onClose,
  onAcknowledge,
  overCategories,
  currentDailyBudget,
  remainingDaysInMonth,
  totalMonthlyBudget,
  spentBeforeToday,
  todaySpent,
  lastTransaction,
}: BorrowSheetProps) {
  const { deleteTransaction } = useBudget()
  const [isDeleting, setIsDeleting] = useState(false)

  if (!open) return null

  const totalOverspend = overCategories.reduce(
    (sum, c) => sum + Math.max(0, c.spent - c.periodBudget),
    0
  )

  // After acknowledging, the rollover formula will naturally adjust tomorrow's budget
  // New daily = (monthlyBudget - spentBeforeToday - todaySpent) / (remainingDays - 1)
  const futureDays = Math.max(remainingDaysInMonth - 1, 1)
  const adjustedDaily = Math.max(0, (totalMonthlyBudget - spentBeforeToday - todaySpent) / futureDays)
  const dailyReduction = Math.max(0, currentDailyBudget - adjustedDaily)

  const handleUndo = async () => {
    if (!lastTransaction) return
    setIsDeleting(true)
    try {
      await deleteTransaction(lastTransaction.id)
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom-full duration-300">
        <div className="bg-card border-t border-border rounded-t-3xl px-6 pt-8 pb-10 max-w-lg mx-auto">
          {/* Over-budget categories */}
          <div className="flex flex-wrap gap-4 mb-6">
            {overCategories.map(cat => {
              const overAmount = cat.spent - cat.periodBudget
              const barColor = getBarColor(cat.percentage)
              return (
                <div key={cat.id} className="flex items-center gap-2">
                  <CategoryIcon
                    name={cat.icon || 'file-text'}
                    color={barColor}
                    size={24}
                  />
                  <span className="text-base font-semibold" style={{ color: barColor }}>
                    {cat.name} is <Rm amount={overAmount} rmClassName="text-current" valueClassName="text-current" /> over
                  </span>
                </div>
              )
            })}
          </div>

          {/* Explanation */}
          <div className="space-y-3 mb-8">
            <p className="text-foreground text-base leading-relaxed">
              Your future daily budget will adjust{' '}
              <span className="font-semibold tabular-nums">
                from <Rm amount={Math.round(currentDailyBudget)} /> → <Rm amount={Math.round(adjustedDaily)} />/day
              </span>{' '}
              for the next {futureDays} days.
            </p>

            <p className="text-muted-foreground text-sm leading-relaxed">
              Try not to make this a habit — your future self is counting on you.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => {
                onAcknowledge()
                onClose()
              }}
              className="w-full h-12 bg-primary text-primary-foreground font-semibold rounded-xl transition-colors hover:bg-primary/90"
            >
              Got it
            </button>

            {lastTransaction && (
              <button
                onClick={handleUndo}
                disabled={isDeleting}
                className="w-full h-10 text-muted-foreground text-sm font-medium hover:text-foreground transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Removing…' : 'Undo last expense'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { useBudget } from '@/lib/budget-context'
import { BudgetRing } from './budget-ring'
import { CategoryBars } from './category-bars'
import { TransactionList } from './transaction-list'
import { AddExpenseModal } from './add-expense-modal'
import { BorrowSheet } from './borrow-sheet'
import { OverBudgetAlerts } from './over-budget-alerts'
import { SettingsSheet } from './settings-sheet'
import { formatCurrency } from '@/lib/types'
import { textSemantics } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { Plus, ChevronDown } from 'lucide-react'
import { format, isToday, isThisWeek, startOfWeek, startOfMonth, differenceInCalendarDays } from 'date-fns'
import type { Transaction } from '@/lib/types'

function getTransactionLocalDate(transaction: Transaction): Date {
  const rawDate = transaction.transaction_date || transaction.created_at

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const [year, month, day] = rawDate.split('-').map(Number)
    return new Date(year, month - 1, day, 12, 0, 0)
  }

  return new Date(rawDate)
}

export function Dashboard() {
  const { profile, categories, transactions, fixedExpenses, isLoading } = useBudget()
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showBorrowSheet, setShowBorrowSheet] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [showCategories, setShowCategories] = useState(false)

  const today = new Date()

  // Days remaining in current week (today through Sunday, inclusive), Mon-Sun week
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const daysRemainingInWeek = dayOfWeek === 0 ? 1 : 8 - dayOfWeek

  // Date label split: line 1 = "Mar 19" or "16 – 19 Mar", line 2 = "Thu"
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const dateLine1 = viewMode === 'week'
    ? `${format(weekStart, 'd')} – ${format(today, 'd MMM')}`
    : format(today, 'MMM d')
  const dateLine2 = format(today, 'EEE')

  // Calculate daily/weekly budget and spending
  // "Jar system" — leftover from previous days redistributes into remaining days
  const budgetData = useMemo(() => {
    const totalMonthlyBudget = categories.reduce((sum, c) => sum + Number(c.budget_amount), 0)
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const monthStart = startOfMonth(today)
    const dayOfMonth = differenceInCalendarDays(today, monthStart) // 0 = first day
    const remainingDaysInMonth = daysInMonth - dayOfMonth // includes today

    // All transactions this month (past days only, excluding today)
    const monthTransactions = transactions.filter(t => {
      const d = getTransactionLocalDate(t)
      return d >= monthStart && d < new Date(today.getFullYear(), today.getMonth(), today.getDate())
    })
    const spentBeforeToday = monthTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
    // Only activate rollover once the user has at least one transaction from a prior day
    const hasSpentBeforeToday = monthTransactions.length > 0

    // Daily budget: flat until user starts using the app, then rollover kicks in
    const flatDailyBudget = daysInMonth > 0 ? totalMonthlyBudget / daysInMonth : 0
    const rolloverDailyBudget = remainingDaysInMonth > 0
      ? Math.max(0, (totalMonthlyBudget - spentBeforeToday) / remainingDaysInMonth)
      : 0
    const dailyBudgetRaw = hasSpentBeforeToday ? rolloverDailyBudget : flatDailyBudget

    // Week budget covers only today through Sunday (remaining days), not a fixed 7 days
    const weeklyBudgetRaw = dailyBudgetRaw * daysRemainingInWeek

    const todayTransactions = transactions.filter(t =>
      isToday(getTransactionLocalDate(t))
    )
    const weekTransactions = transactions.filter(t =>
      isThisWeek(getTransactionLocalDate(t), { weekStartsOn: 1 })
    )

    const todaySpent = todayTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
    const weekSpent = weekTransactions.reduce((sum, t) => sum + Number(t.amount), 0)

    // Week remaining = budget for remaining days minus only today's spending
    const weekRemainingRaw = Math.max(0, weeklyBudgetRaw - todaySpent)

    return {
      dailyBudgetRaw,
      weeklyBudgetRaw,
      todaySpent,
      weekSpent: weeklyBudgetRaw - weekRemainingRaw, // for ring display
      todayTransactions,
      weekTransactions,
      daysInMonth,
      remainingDaysInMonth,
      spentBeforeToday,
      hasSpentBeforeToday,
      totalMonthlyBudget,
      todayRemainingRaw: Math.max(0, dailyBudgetRaw - todaySpent),
      weekRemainingRaw,
    }
  }, [categories, transactions, today, daysRemainingInWeek])

  // Calculate category spending for selected period (day/week)
  // Per-category "jar system" — each category's leftover rolls into remaining days
  const categorySpending = useMemo(() => {
    const selectedTransactions = viewMode === 'day'
      ? budgetData.todayTransactions
      : budgetData.weekTransactions

    // All transactions this month before today (for per-category rollover)
    const monthStart = startOfMonth(today)
    const monthBeforeTodayTransactions = transactions.filter(t => {
      const d = getTransactionLocalDate(t)
      return d >= monthStart && d < new Date(today.getFullYear(), today.getMonth(), today.getDate())
    })

    return categories.map(cat => {
      const categoryMonthlyBudget = Number(cat.budget_amount)

      // How much of this category was spent in previous days this month
      const categorySpentBefore = monthBeforeTodayTransactions
        .filter(t => t.category_id === cat.id)
        .reduce((sum, t) => sum + Number(t.amount), 0)

      // Rollover only activates once user has prior spending; otherwise flat
      const flatCategoryDaily = budgetData.daysInMonth > 0 ? categoryMonthlyBudget / budgetData.daysInMonth : 0
      const rolloverCategoryDaily = budgetData.remainingDaysInMonth > 0
        ? Math.max(0, (categoryMonthlyBudget - categorySpentBefore) / budgetData.remainingDaysInMonth)
        : 0
      const categoryDailyBudget = budgetData.hasSpentBeforeToday ? rolloverCategoryDaily : flatCategoryDaily

      const periodBudget = viewMode === 'day'
        ? categoryDailyBudget
        : categoryDailyBudget * daysRemainingInWeek

      const spent = selectedTransactions
        .filter(t => t.category_id === cat.id)
        .reduce((sum, t) => sum + Number(t.amount), 0)

      return {
        ...cat,
        periodBudget,
        spent,
        remaining: periodBudget - spent,
        percentage: periodBudget > 0
          ? (spent / periodBudget) * 100
          : 0,
      }
    })
  }, [categories, transactions, budgetData.remainingDaysInMonth, budgetData.todayTransactions, budgetData.weekTransactions, viewMode, today, daysRemainingInWeek])

  const currentBudget = viewMode === 'day' ? budgetData.dailyBudgetRaw : budgetData.weeklyBudgetRaw
  const currentSpent = viewMode === 'day' ? budgetData.todaySpent : budgetData.weekSpent
  const currentRemaining = viewMode === 'day' ? budgetData.todayRemainingRaw : budgetData.weekRemainingRaw
  const displayTransactions = viewMode === 'day' ? budgetData.todayTransactions : budgetData.weekTransactions

  // Over-budget categories (red territory) for borrow CTA
  const overBudgetCategories = useMemo(
    () => categorySpending.filter(c => c.periodBudget > 0 && c.percentage > 100),
    [categorySpending]
  )
  const hasOverBudget = overBudgetCategories.length > 0

  // Last transaction for undo
  const lastTransaction = displayTransactions.length > 0 ? displayTransactions[0] : null

  // Compute daily reduction for the badge
  const futureDays = Math.max(budgetData.remainingDaysInMonth - 1, 1)
  const adjustedDaily = Math.max(0, (budgetData.totalMonthlyBudget - budgetData.spentBeforeToday - budgetData.todaySpent) / futureDays)
  const dailyReduction = Math.max(0, budgetData.dailyBudgetRaw - adjustedDaily)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (showSettings) {
    return (
      <SettingsSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        profile={profile}
        fixedExpenses={fixedExpenses}
        categories={categories}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <button
            onClick={() => setViewMode('day')}
            className={cn(textSemantics.screenTitle, 'transition-colors',
              viewMode === 'day' ? 'text-foreground' : 'text-secondary'
            )}
          >
            Today
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={cn(textSemantics.screenTitle, 'transition-colors',
              viewMode === 'week' ? 'text-foreground' : 'text-secondary'
            )}
          >
            This Week
          </button>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 29.3334C23.3638 29.3334 29.3333 23.3638 29.3333 16C29.3333 8.63622 23.3638 2.66669 16 2.66669C8.63621 2.66669 2.66667 8.63622 2.66667 16C2.66667 23.3638 8.63621 29.3334 16 29.3334Z" stroke="currentColor" strokeWidth="2"/>
            <path d="M16 8V24M20 12.6667C20 10.8267 18.2093 9.33333 16 9.33333C13.7907 9.33333 12 10.8267 12 12.6667C12 14.5067 13.7907 16 16 16C18.2093 16 20 17.4933 20 19.3333C20 21.1733 18.2093 22.6667 16 22.6667C13.7907 22.6667 12 21.1733 12 19.3333" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </header>

      {/* Main Card */}
      <div className="mx-6 bg-card rounded-3xl p-6 border border-border relative">
        {/* Date — absolute top-left */}
        <div className="absolute left-6 top-[22px]">
          <p className="text-xl font-semibold text-foreground leading-tight">{dateLine1}</p>
          <p className="text-xl text-muted-foreground leading-tight">{dateLine2}</p>
          {acknowledged && hasOverBudget && dailyReduction > 0.5 && (
            <p className="text-sm text-muted-foreground mt-1 tabular-nums">
              −RM {Math.round(dailyReduction)}/day
            </p>
          )}
        </div>

        {/* Expand button — absolute top-right */}
        <button
          onClick={() => setShowCategories(prev => !prev)}
          className={`absolute right-6 top-[22px] h-8 w-8 flex items-center justify-center transition-colors ${
            showCategories ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-label={showCategories ? 'Collapse categories' : 'Expand categories'}
        >
          <ChevronDown className={`h-8 w-8 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${showCategories ? 'rotate-180' : 'rotate-0'}`} />
        </button>

        {/* Budget Ring */}
        <div className="flex justify-center mb-8 mt-4">
          <BudgetRing
            budget={currentBudget}
            spent={currentSpent}
            remaining={currentRemaining}
          />
        </div>

        {/* Over-budget alerts — absolute bottom-left */}
        <OverBudgetAlerts categories={categorySpending} isExpanded={showCategories} acknowledged={acknowledged} />

        {/* Borrow CTA — absolute bottom-right, only when over-budget and not acknowledged */}
        {hasOverBudget && !acknowledged && !showCategories && (
          <button
            onClick={() => setShowBorrowSheet(true)}
            className="absolute right-6 bottom-[22px] h-10 px-4 bg-destructive/10 text-destructive text-sm font-semibold rounded-full transition-all hover:bg-destructive/20 animate-in fade-in-0 duration-300"
          >
            Balance it
          </button>
        )}

        {/* Category Bars */}
        <CategoryBars categories={categorySpending} isExpanded={showCategories} acknowledged={acknowledged} />
      </div>

      {/* Transactions Section */}
      <div className="px-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Transactions</h2>
        </div>

        <TransactionList transactions={displayTransactions} />
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddExpense(true)}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[72px] h-[72px] bg-primary border-[8px] border-background rounded-full flex items-center justify-center"
      >
        <Plus className="h-12 w-12 text-primary-foreground" />
      </button>

      {/* Modals */}
      <AddExpenseModal
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        categories={categories}
      />

      <BorrowSheet
        open={showBorrowSheet}
        onClose={() => setShowBorrowSheet(false)}
        onAcknowledge={() => setAcknowledged(true)}
        overCategories={overBudgetCategories}
        currentDailyBudget={budgetData.dailyBudgetRaw}
        remainingDaysInMonth={budgetData.remainingDaysInMonth}
        totalMonthlyBudget={budgetData.totalMonthlyBudget}
        spentBeforeToday={budgetData.spentBeforeToday}
        todaySpent={budgetData.todaySpent}
        lastTransaction={lastTransaction}
      />
    </div>
  )
}

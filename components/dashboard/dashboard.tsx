'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useBudget } from '@/lib/budget-context'
import { BudgetRing } from './budget-ring'
import { CategoryBars } from './category-bars'
import { TransactionList } from './transaction-list'
import { AddExpenseModal } from './add-expense-modal'
import { SettingsSheet } from './settings-sheet'
import { formatCurrency } from '@/lib/types'
import { SlidersHorizontal, Plus } from 'lucide-react'
import { format, isToday, isThisWeek, startOfWeek } from 'date-fns'

export function Dashboard() {
  const { profile, categories, transactions, isLoading } = useBudget()
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')

  const today = new Date()
  const formattedDate = format(today, 'MMM d, EEE')

  // Calculate daily/weekly budget and spending
  const budgetData = useMemo(() => {
    const totalMonthlyBudget = categories.reduce((sum, c) => sum + Number(c.budget_amount), 0)
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const dailyBudget = totalMonthlyBudget / daysInMonth
    const weeklyBudget = dailyBudget * 7

    const todayTransactions = transactions.filter(t => 
      isToday(new Date(t.transaction_date))
    )
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekTransactions = transactions.filter(t => 
      isThisWeek(new Date(t.transaction_date), { weekStartsOn: 1 })
    )

    const todaySpent = todayTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
    const weekSpent = weekTransactions.reduce((sum, t) => sum + Number(t.amount), 0)

    return {
      dailyBudget: Math.round(dailyBudget),
      weeklyBudget: Math.round(weeklyBudget),
      todaySpent,
      weekSpent,
      todayTransactions,
      weekTransactions,
      todayRemaining: Math.max(0, dailyBudget - todaySpent),
      weekRemaining: Math.max(0, weeklyBudget - weekSpent),
    }
  }, [categories, transactions, today])

  // Calculate category spending for the month
  const categorySpending = useMemo(() => {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthTransactions = transactions.filter(t => 
      new Date(t.transaction_date) >= monthStart
    )

    return categories.map(cat => {
      const spent = monthTransactions
        .filter(t => t.category_id === cat.id)
        .reduce((sum, t) => sum + Number(t.amount), 0)
      return {
        ...cat,
        spent,
        remaining: Number(cat.budget_amount) - spent,
        percentage: Number(cat.budget_amount) > 0 
          ? (spent / Number(cat.budget_amount)) * 100 
          : 0,
      }
    })
  }, [categories, transactions, today])

  const currentBudget = viewMode === 'day' ? budgetData.dailyBudget : budgetData.weeklyBudget
  const currentSpent = viewMode === 'day' ? budgetData.todaySpent : budgetData.weekSpent
  const currentRemaining = viewMode === 'day' ? budgetData.todayRemaining : budgetData.weekRemaining
  const displayTransactions = viewMode === 'day' ? budgetData.todayTransactions : budgetData.weekTransactions

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Spent today</h1>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <SlidersHorizontal className="h-6 w-6" />
        </button>
      </header>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="mx-6 bg-card rounded-3xl p-6 border border-border"
      >
        {/* Date */}
        <p className="text-lg font-semibold text-foreground mb-6">{formattedDate}</p>

        {/* Budget Ring */}
        <div className="flex justify-center mb-8">
          <BudgetRing
            budget={currentBudget}
            spent={currentSpent}
            remaining={currentRemaining}
          />
        </div>

        {/* Category Bars */}
        <CategoryBars categories={categorySpending} />
      </motion.div>

      {/* Transactions Section */}
      <div className="px-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Transactions</h2>
          
          {/* View Toggle */}
          <div className="flex bg-card rounded-full p-1">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                viewMode === 'day'
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                viewMode === 'week'
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              Week
            </button>
          </div>
        </div>

        <TransactionList transactions={displayTransactions} />
      </div>

      {/* Floating Add Button */}
      <motion.button
        onClick={() => setShowAddExpense(true)}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30"
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.1 }}
      >
        <Plus className="h-8 w-8 text-primary-foreground" />
      </motion.button>

      {/* Modals */}
      <AddExpenseModal
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        categories={categories}
      />

      <SettingsSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        profile={profile}
      />
    </div>
  )
}

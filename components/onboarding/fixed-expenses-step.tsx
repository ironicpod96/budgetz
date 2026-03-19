'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/types'
import { ChevronLeft, Plus, X, Check } from 'lucide-react'

interface FixedExpense {
  name: string
  amount: number
}

interface FixedExpensesStepProps {
  onNext: (expenses: FixedExpense[]) => void
  onBack: () => void
  isSubmitting: boolean
}

const COMMON_EXPENSES = [
  'Rent',
  'Car Loan',
  'House Loan',
  'Insurance',
  'Internet',
  'Phone Bill',
  'Gym',
  'Subscriptions',
]

export function FixedExpensesStep({ onNext, onBack, isSubmitting }: FixedExpensesStepProps) {
  const [expenses, setExpenses] = useState<FixedExpense[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')

  const totalFixed = expenses.reduce((sum, e) => sum + e.amount, 0)

  const addExpense = (name?: string) => {
    const expenseName = name || newName.trim()
    const amount = parseFloat(newAmount) || 0

    if (expenseName && amount > 0) {
      setExpenses(prev => [...prev, { name: expenseName, amount }])
      setNewName('')
      setNewAmount('')
      setShowAddForm(false)
    }
  }

  const removeExpense = (index: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== index))
  }

  const handleQuickAdd = (name: string) => {
    if (!expenses.find(e => e.name === name)) {
      setNewName(name)
      setShowAddForm(true)
    }
  }

  return (
    <div className="flex-1 flex flex-col px-6 pb-8">
      <div className="flex-1 overflow-auto">
        <button
          onClick={onBack}
          className="flex items-center text-muted-foreground mb-4 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Back
        </button>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          Fixed expenses
        </h1>
        <p className="text-muted-foreground mb-6">
          Add your recurring monthly commitments like rent, loans, and bills.
        </p>

        {/* Quick Add Chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {COMMON_EXPENSES.filter(name => !expenses.find(e => e.name === name)).map(name => (
            <button
              key={name}
              onClick={() => handleQuickAdd(name)}
              className="px-4 py-2 bg-card border border-border rounded-full text-sm text-foreground hover:border-primary/50 transition-colors"
            >
              + {name}
            </button>
          ))}
        </div>

        {/* Added Expenses */}
        <AnimatePresence mode="popLayout">
          {expenses.map((expense, index) => (
            <motion.div
              key={`${expense.name}-${index}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="bg-card rounded-xl p-4 border border-border flex items-center justify-between mb-3"
            >
              <span className="text-foreground font-medium">{expense.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{formatCurrency(expense.amount)}</span>
                <button
                  onClick={() => removeExpense(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add Form */}
        <AnimatePresence>
          {showAddForm ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="bg-card rounded-xl p-4 border border-primary mb-3"
            >
              <div className="flex gap-3 mb-3">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Expense name"
                  className="flex-1 bg-secondary text-foreground rounded-lg px-3 py-2 border-0 focus:ring-1 focus:ring-primary outline-none"
                />
                <div className="relative w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    RM
                  </span>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-secondary text-foreground text-right font-medium rounded-lg px-3 py-2 pl-10 border-0 focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewName('')
                    setNewAmount('')
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => addExpense()}
                  disabled={!newName.trim() || !newAmount}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Add
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowAddForm(true)}
              className="w-full py-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add custom expense
            </motion.button>
          )}
        </AnimatePresence>

        {/* Total */}
        {expenses.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 bg-card rounded-2xl p-4 border border-border"
          >
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Fixed Expenses</span>
              <span className="text-xl font-bold text-foreground">{formatCurrency(totalFixed)}</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Complete Button */}
      <Button
        onClick={() => onNext(expenses)}
        disabled={isSubmitting}
        className="w-full h-14 text-lg font-semibold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 mt-6"
      >
        {isSubmitting ? (
          'Setting up...'
        ) : (
          <>
            Complete Setup
            <Check className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>
    </div>
  )
}

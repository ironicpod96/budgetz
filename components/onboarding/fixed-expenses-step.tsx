'use client'

import { useState } from 'react'
import { SavingsTargetControl } from '@/components/savings-target-control'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { formatCurrency } from '@/lib/types'
import { Rm } from '@/components/ui/currency'
import { ChevronLeft, Plus, X, Check } from 'lucide-react'

interface FixedExpense {
  name: string
  amount: number
}

interface FixedExpensesStepProps {
  takeHome: number
  initialExpenses: FixedExpense[]
  initialSavingsRate: number
  onNext: (expenses: FixedExpense[], savingsRate: number) => void
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

export function FixedExpensesStep({
  takeHome,
  initialExpenses,
  initialSavingsRate,
  onNext,
  onBack,
  isSubmitting,
}: FixedExpensesStepProps) {
  const [expenses, setExpenses] = useState<FixedExpense[]>(initialExpenses)
  const [savingsRate, setSavingsRate] = useState<number>(initialSavingsRate)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')

  const totalFixed = expenses.reduce((sum, e) => sum + e.amount, 0)
  const savingsTargetAmount = (takeHome * savingsRate) / 100

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
        {expenses.map((expense, index) => (
          <div
            key={`${expense.name}-${index}`}
            className="bg-card rounded-xl p-4 border border-border flex items-center justify-between mb-3"
          >
            <span className="text-foreground font-medium">{expense.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground"><Rm amount={expense.amount} /></span>
              <button
                onClick={() => removeExpense(index)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Add Form */}
        {showAddForm ? (
          <div className="bg-card rounded-xl p-4 border border-primary mb-3">
              <div className="flex gap-3 mb-3">
                <Input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Expense name"
                  className="flex-1"
                />
                <InputGroup className="w-28">
                  <InputGroupAddon>
                    <InputGroupText>RM</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    type="number"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    placeholder="0"
                    className="text-right font-medium"
                  />
                </InputGroup>
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
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add custom expense
          </button>
        )}

        {/* Total */}
        {(expenses.length > 0 || takeHome > 0) && (
          <div className="mt-6 bg-card rounded-2xl p-4 border border-border">
            <div className="space-y-4">
              <div>
                <p className="text-foreground font-medium">Savings target</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Set aside a simple target before budget suggestions.
                </p>
              </div>

              <SavingsTargetControl
                savingsRate={savingsRate}
                takeHome={takeHome}
                onChange={setSavingsRate}
              />

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-muted-foreground">Total Fixed Commitments</span>
                <span className="text-xl font-bold text-foreground">
                  <Rm amount={totalFixed + savingsTargetAmount} />
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Complete Button */}
      <Button
        onClick={() => onNext(expenses, savingsRate)}
        disabled={isSubmitting}
        className="w-full h-14 text-lg font-semibold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 mt-6"
      >
        {isSubmitting ? (
          'Setting up...'
        ) : (
          <>
            Continue to Budget Allocation
            <Check className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>
    </div>
  )
}

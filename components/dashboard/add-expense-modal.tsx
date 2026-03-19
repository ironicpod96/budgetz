'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useBudget } from '@/lib/budget-context'
import { formatCurrency } from '@/lib/types'
import { CategoryIcon } from '@/components/category-icon'
import type { BudgetCategory } from '@/lib/types'
import { Check, Delete } from 'lucide-react'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

interface AddExpenseModalProps {
  open: boolean
  onClose: () => void
  categories: BudgetCategory[]
}

export function AddExpenseModal({ open, onClose, categories }: AddExpenseModalProps) {
  const { addTransaction } = useBudget()
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<'amount' | 'category'>('amount')

  const displayAmount = amount ? parseFloat(amount) : 0

  const handleNumberPress = (num: string) => {
    if (num === '.' && amount.includes('.')) return
    if (amount.includes('.') && amount.split('.')[1]?.length >= 2) return
    setAmount(prev => prev + num)
  }

  const handleDelete = () => {
    setAmount(prev => prev.slice(0, -1))
  }

  const handleClear = () => {
    setAmount('')
  }

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId)
  }

  const handleSubmit = async () => {
    if (!selectedCategory || displayAmount <= 0) return

    setIsSubmitting(true)
    try {
      await addTransaction({
        categoryId: selectedCategory,
        amount: displayAmount,
        name: name.trim() || undefined,
      })
      // Reset and close
      setAmount('')
      setSelectedCategory(null)
      setName('')
      setStep('amount')
      onClose()
    } catch (error) {
      console.error('Failed to add transaction:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (displayAmount > 0) {
      setStep('category')
    }
  }

  const handleBack = () => {
    setStep('amount')
  }

  const handleClose = () => {
    setAmount('')
    setSelectedCategory(null)
    setName('')
    setStep('amount')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border p-0 gap-0 max-w-md mx-auto rounded-3xl overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Add Expense</DialogTitle>
        </VisuallyHidden>
        
        <AnimatePresence mode="wait">
          {step === 'amount' ? (
            <motion.div
              key="amount"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Amount Display */}
              <div className="p-6 pb-4">
                <p className="text-sm text-muted-foreground mb-2">Amount</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-muted-foreground text-2xl">RM</span>
                  <span className="text-5xl font-bold text-foreground tabular-nums">
                    {displayAmount > 0 ? displayAmount.toFixed(amount.includes('.') ? Math.min(2, amount.split('.')[1]?.length || 0) : 0) : '0'}
                  </span>
                </div>
              </div>

              {/* Optional Name Input */}
              <div className="px-6 pb-4">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Add description (optional)"
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 text-sm border-0 focus:ring-1 focus:ring-primary outline-none placeholder:text-muted-foreground"
                />
              </div>

              {/* Numpad */}
              <Numpad
                onNumberPress={handleNumberPress}
                onDelete={handleDelete}
                onClear={handleClear}
              />

              {/* Next Button */}
              <div className="p-4 pt-2">
                <button
                  onClick={handleNext}
                  disabled={displayAmount <= 0}
                  className="w-full h-14 bg-primary text-primary-foreground font-semibold rounded-2xl disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
                >
                  Next
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="category"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Header */}
              <div className="p-6 pb-4 flex items-center justify-between">
                <button
                  onClick={handleBack}
                  className="text-primary font-medium"
                >
                  Back
                </button>
                <div className="text-center">
                  <span className="text-2xl font-bold text-foreground">
                    {formatCurrency(displayAmount)}
                  </span>
                  {name && (
                    <p className="text-sm text-muted-foreground">{name}</p>
                  )}
                </div>
                <div className="w-10" />
              </div>

              {/* Category Selection */}
              <div className="px-6 pb-4">
                <p className="text-sm text-muted-foreground mb-3">Select Category</p>
                <div className="grid grid-cols-4 gap-3">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 ${
                        selectedCategory === category.id
                          ? 'bg-primary/20 ring-2 ring-primary'
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${category.color}30` }}
                      >
                        <CategoryIcon
                          name={category.icon || 'file-text'}
                          color={category.color || '#8E8E93'}
                          size={20}
                        />
                      </div>
                      <span className="text-xs text-foreground truncate w-full text-center">
                        {category.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="p-4 pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={!selectedCategory || isSubmitting}
                  className="w-full h-14 bg-primary text-primary-foreground font-semibold rounded-2xl disabled:opacity-50 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      Add Expense
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

interface NumpadProps {
  onNumberPress: (num: string) => void
  onDelete: () => void
  onClear: () => void
}

function Numpad({ onNumberPress, onDelete, onClear }: NumpadProps) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'del'],
  ]

  return (
    <div className="px-4 pb-2">
      {keys.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-2 mb-2">
          {row.map(key => (
            <button
              key={key}
              onClick={() => {
                if (key === 'del') {
                  onDelete()
                } else {
                  onNumberPress(key)
                }
              }}
              onDoubleClick={() => {
                if (key === 'del') {
                  onClear()
                }
              }}
              className="flex-1 h-14 bg-secondary rounded-xl text-xl font-medium text-foreground active:bg-muted transition-colors duration-100 flex items-center justify-center"
            >
              {key === 'del' ? (
                <Delete className="h-6 w-6" />
              ) : (
                key
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

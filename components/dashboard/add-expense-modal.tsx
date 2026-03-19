'use client'

import { useEffect, useState } from 'react'
import { CategoryLabel } from '@/components/category-label'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useBudget } from '@/lib/budget-context'
import { formatCurrency } from '@/lib/types'
import { CategoryIcon } from '@/components/category-icon'
import type { BudgetCategory } from '@/lib/types'
import { Check, Delete, X } from 'lucide-react'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

  const displayAmount = amount ? parseFloat(amount) : 0

  useEffect(() => {
    if (open) {
      setSelectedCategory(prev => {
        if (prev && categories.some(category => category.id === prev)) {
          return prev
        }
        return categories[0]?.id ?? null
      })
    }
  }, [open, categories])

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
      onClose()
    } catch (error) {
      console.error('Failed to add transaction:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setAmount('')
    setSelectedCategory(categories[0]?.id ?? null)
    setName('')
    onClose()
  }

  const selectedCategoryData = categories.find(category => category.id === selectedCategory)

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) {
          handleClose()
        }
      }}
    >
      <DialogContent showCloseButton={false} className="bg-card border-border p-0 gap-0 max-w-md mx-auto rounded-3xl overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Add Expense</DialogTitle>
        </VisuallyHidden>

        <div>
          <div className="flex justify-end px-4 pt-4">
            <DialogClose className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-8 w-8" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>

          <div className="p-6 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-5xl font-bold tabular-nums">
                <span className="text-muted-foreground">RM</span>
                {' '}
                <span className="text-foreground">
                  {displayAmount > 0 ? displayAmount.toFixed(amount.includes('.') ? Math.min(2, amount.split('.')[1]?.length || 0) : 0) : '0'}
                </span>
              </div>

              <Select
                value={selectedCategory ?? undefined}
                onValueChange={value => setSelectedCategory(value)}
              >
                <SelectTrigger className="m-1 h-14 w-14 data-[size=default]:h-14 data-[size=sm]:h-14 min-w-0 justify-center gap-0 rounded-md border-0 !bg-transparent dark:!bg-transparent hover:!bg-secondary/25 dark:hover:!bg-secondary/25 data-[state=open]:!bg-secondary/35 dark:data-[state=open]:!bg-secondary/35 text-foreground px-0 py-0 [&>svg]:size-6 [&>svg:last-child]:hidden">
                  <div className="flex h-full w-full items-center justify-center">
                    {selectedCategoryData ? (
                      <>
                        <CategoryIcon
                          name={selectedCategoryData.icon || 'file-text'}
                          color="#FFFFFF"
                          size={48}
                          className="size-12"
                        />
                      </>
                    ) : (
                      <SelectValue placeholder="Category" />
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent position="popper" align="end" sideOffset={8} className="min-w-44 bg-card border-border p-1">
                  {categories.map(category => (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                      className="mx-1 min-h-12 rounded-md bg-transparent px-3 py-2 text-muted-foreground focus:bg-transparent data-[state=checked]:bg-secondary data-[state=checked]:text-white [&>span:first-child]:hidden"
                    >
                      <CategoryLabel
                        name={category.name}
                        icon={category.icon}
                        size="md"
                        colorClassName="text-inherit"
                        className="w-full"
                      />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-1 min-h-6">
              {name ? (
                <p className="text-sm text-muted-foreground">
                  {name}
                </p>
              ) : selectedCategoryData ? (
                <CategoryLabel
                  name={selectedCategoryData.name}
                  icon={selectedCategoryData.icon}
                  size="sm"
                />
              ) : null}
            </div>
          </div>

          <div className="px-6 pb-4">
            <Input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Add description (optional)"
              className="text-sm"
            />
          </div>

          <Numpad
            onNumberPress={handleNumberPress}
            onDelete={handleDelete}
            onClear={handleClear}
          />

          <div className="p-4 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!selectedCategory || displayAmount <= 0 || isSubmitting}
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
        </div>
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
              className="flex-1 h-16 bg-secondary rounded-xl text-xl font-medium text-foreground active:bg-muted transition-colors duration-100 flex items-center justify-center"
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

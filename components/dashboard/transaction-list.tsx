'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrency } from '@/lib/types'
import { CategoryIcon } from '@/components/category-icon'
import type { Transaction } from '@/lib/types'
import { useBudget } from '@/lib/budget-context'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

interface TransactionListProps {
  transactions: Transaction[]
}

export function TransactionList({ transactions }: TransactionListProps) {
  const { deleteTransaction } = useBudget()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteTransaction(id)
    } finally {
      setDeletingId(null)
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-8 text-center">
        <p className="text-muted-foreground">No transactions yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Tap the + button to add an expense
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {transactions.map((transaction, index) => (
          <motion.div
            key={transaction.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ 
              delay: index * 0.03, 
              duration: 0.2, 
              ease: [0.4, 0, 0.2, 1] 
            }}
            className="bg-card rounded-2xl p-4 flex items-center gap-4 group"
          >
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center bg-secondary"
              style={{
                backgroundColor: transaction.category?.color 
                  ? `${transaction.category.color}20` 
                  : undefined,
              }}
            >
              <CategoryIcon
                name={transaction.category?.icon || 'file-text'}
                color={transaction.category?.color || '#8E8E93'}
                size={22}
              />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium truncate">
                {transaction.name || transaction.category?.name || 'Expense'}
              </p>
              {transaction.name && transaction.category && (
                <p className="text-sm text-muted-foreground">
                  {transaction.category.name}
                </p>
              )}
            </div>

            {/* Amount */}
            <span className="text-lg font-semibold text-muted-foreground">
              {formatCurrency(Number(transaction.amount))}
            </span>

            {/* Delete button */}
            <button
              onClick={() => handleDelete(transaction.id)}
              disabled={deletingId === transaction.id}
              className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive transition-all"
            >
              {deletingId === transaction.id ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

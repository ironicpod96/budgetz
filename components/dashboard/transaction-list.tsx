'use client'

import { CategoryLabel } from '@/components/category-label'
import { formatCurrency } from '@/lib/types'
import { Rm } from '@/components/ui/currency'
import type { Transaction } from '@/lib/types'
import { useBudget } from '@/lib/budget-context'
import { Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

interface TransactionListProps {
  transactions: Transaction[]
}

export function TransactionList({ transactions }: TransactionListProps) {
  const { deleteTransaction } = useBudget()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [swipedId, setSwipedId] = useState<string | null>(null)
  const [dragX, setDragX] = useState(0)
  const [isDesktopPointer, setIsDesktopPointer] = useState(false)
  const startXRef = useRef(0)
  const activeIdRef = useRef<string | null>(null)

  const ACTION_WIDTH = 88
  const OPEN_THRESHOLD = 36

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
    const updatePointerMode = () => setIsDesktopPointer(mediaQuery.matches)

    updatePointerMode()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePointerMode)
      return () => mediaQuery.removeEventListener('change', updatePointerMode)
    }

    mediaQuery.addListener(updatePointerMode)
    return () => mediaQuery.removeListener(updatePointerMode)
  }, [])

  useEffect(() => {
    if (!isDesktopPointer) return
    setSwipedId(null)
    setDragX(0)
    activeIdRef.current = null
  }, [isDesktopPointer])

  useEffect(() => {
    if (!swipedId || isDesktopPointer) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const activeRow = target.closest(`[data-transaction-id="${swipedId}"]`)
      if (!activeRow) {
        setSwipedId(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [swipedId, isDesktopPointer])

  const getOffset = (id: string) => {
    if (isDesktopPointer) return 0
    if (activeIdRef.current === id && dragX !== 0) {
      return dragX
    }
    return swipedId === id ? -ACTION_WIDTH : 0
  }

  const handleTouchStart = (id: string, clientX: number) => {
    if (isDesktopPointer) return
    startXRef.current = clientX
    activeIdRef.current = id
    setDragX(swipedId === id ? -ACTION_WIDTH : 0)
  }

  const handleTouchMove = (clientX: number) => {
    if (isDesktopPointer) return
    if (!activeIdRef.current) return
    const delta = clientX - startXRef.current
    const clamped = Math.max(-ACTION_WIDTH, Math.min(0, delta))
    setDragX(clamped)
  }

  const handleTouchEnd = () => {
    if (isDesktopPointer) return
    if (!activeIdRef.current) return

    const shouldOpen = dragX <= -OPEN_THRESHOLD
    setSwipedId(shouldOpen ? activeIdRef.current : null)
    activeIdRef.current = null
    setDragX(0)
  }

  const handleDelete = async (transaction: Transaction) => {
    const itemLabel = transaction.category?.name || transaction.name || 'Expense'
    setDeletingId(transaction.id)
    try {
      await deleteTransaction(transaction.id)
      setSwipedId(null)
      toast(`${itemLabel} is removed.`)
    } finally {
      setDeletingId(null)
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-8 text-center">
        <p className="text-muted-foreground">No transactions yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <ContextMenu key={transaction.id}>
          <ContextMenuTrigger asChild>
            <div className="relative overflow-hidden rounded-2xl" data-transaction-id={transaction.id}>
              {!isDesktopPointer && (
                <button
                  onClick={() => handleDelete(transaction)}
                  disabled={deletingId === transaction.id}
                  className="absolute right-0 top-0 flex h-full w-[88px] items-center justify-center bg-destructive text-white"
                >
                  {deletingId === transaction.id ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="h-6 w-6" />
                  )}
                </button>
              )}

              <div
                className="bg-card p-4 flex items-center gap-4 touch-pan-y transition-[transform,background-color] duration-200 hover:bg-secondary/20"
                style={{ transform: `translateX(${getOffset(transaction.id)}px)` }}
                onTouchStart={(event) => handleTouchStart(transaction.id, event.touches[0].clientX)}
                onTouchMove={(event) => handleTouchMove(event.touches[0].clientX)}
                onTouchEnd={handleTouchEnd}
                onClick={() => {
                  if (swipedId && swipedId !== transaction.id) {
                    setSwipedId(null)
                  }
                }}
              >
                {/* Time */}
                <div className="w-12 shrink-0 text-center">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(transaction.created_at), 'h:mm a')}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium truncate">
                    {transaction.name || transaction.category?.name || 'Expense'}
                  </p>
                  {transaction.name && transaction.category && (
                    <CategoryLabel
                      name={transaction.category.name}
                      icon={transaction.category.icon}
                      size="sm"
                      className="mt-1"
                    />
                  )}
                </div>

                {/* Amount */}
                <span className="text-xl font-semibold">
                  <Rm amount={Number(transaction.amount)} />
                </span>
              </div>
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent className="w-40">
            <ContextMenuItem
              variant="destructive"
              onClick={() => handleDelete(transaction)}
              disabled={deletingId === transaction.id}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ))}
    </div>
  )
}

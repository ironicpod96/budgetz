'use client'

import { useEffect, useMemo, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Rm } from '@/components/ui/currency'

interface SavingsTargetControlProps {
  savingsRate: number
  takeHome: number
  onChange: (nextRate: number) => void
  editable?: boolean
  className?: string
}

function formatRate(value: number) {
  return value.toLocaleString('en-MY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function clampRate(value: number) {
  return Math.min(Math.max(value, 0), 80)
}

export function SavingsTargetControl({
  savingsRate,
  takeHome,
  onChange,
  editable = true,
  className,
}: SavingsTargetControlProps) {
  const [activeTab, setActiveTab] = useState<'rate' | 'amount'>('rate')
  const [editingField, setEditingField] = useState<'rate' | 'amount' | null>(null)

  const monthlyAmount = useMemo(
    () => Math.max((takeHome * savingsRate) / 100, 0),
    [takeHome, savingsRate]
  )

  const roundedMonthlyAmount = Math.round(monthlyAmount)
  const [rateInput, setRateInput] = useState(formatRate(savingsRate))
  const [amountInput, setAmountInput] = useState(roundedMonthlyAmount.toLocaleString('en-MY'))

  useEffect(() => {
    if (editingField !== 'rate') {
      setRateInput(formatRate(savingsRate))
    }

    if (editingField !== 'amount') {
      setAmountInput(roundedMonthlyAmount.toLocaleString('en-MY'))
    }
  }, [editingField, roundedMonthlyAmount, savingsRate])

  const handleSelectAll = (event: FocusEvent<HTMLInputElement>) => {
    event.currentTarget.select()
  }

  const commitRateInput = (value: string) => {
    const sanitized = value.replace(/[^\d.]/g, '')
    if (!sanitized) {
      setRateInput(formatRate(savingsRate))
      return
    }

    const parsed = clampRate(Number(sanitized))
    if (!Number.isFinite(parsed)) {
      setRateInput(formatRate(savingsRate))
      return
    }

    const normalized = Math.round(parsed * 100) / 100
    setRateInput(formatRate(normalized))
    onChange(normalized)
  }

  const handleRateChange = (value: string) => {
    const sanitized = value.replace(/[^\d.]/g, '')
    setRateInput(sanitized)
  }

  const commitAmountInput = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) {
      setAmountInput(roundedMonthlyAmount.toLocaleString('en-MY'))
      return
    }

    const amount = Number(digits)
    const nextRate = takeHome > 0
      ? clampRate(Math.round((amount / takeHome) * 10000) / 100)
      : 0

    setAmountInput(amount.toLocaleString('en-MY'))
    onChange(nextRate)
  }

  const handleAmountChange = (value: string) => {
    const digits = value.replace(/\D/g, '')
    const formatted = digits ? Number(digits).toLocaleString('en-MY') : ''
    setAmountInput(formatted)
  }

  const handleInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    field: 'rate' | 'amount'
  ) => {
    if (event.key !== 'Enter') return

    if (field === 'rate') {
      commitRateInput(rateInput)
    } else {
      commitAmountInput(amountInput)
    }

    event.currentTarget.blur()
  }

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={value => setActiveTab(value as 'rate' | 'amount')} className="items-center gap-4">
        <div className="mt-3 flex w-full items-center justify-between gap-4">
          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            onClick={() => onChange(Math.max(savingsRate - 1, 0))}
            disabled={!editable}
            className="rounded-full"
            aria-label="Decrease savings target"
          >
            <Minus className="h-5 w-5" />
          </Button>

          <div className="min-w-0 flex-1 text-center">
            {activeTab === 'rate' ? (
              <>
                <div className="flex items-baseline justify-center gap-2 text-4xl font-bold tracking-tight text-foreground">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rateInput}
                    onChange={event => handleRateChange(event.target.value)}
                    onFocus={event => {
                      setEditingField('rate')
                      handleSelectAll(event)
                    }}
                    onBlur={() => {
                      commitRateInput(rateInput)
                      setEditingField(null)
                    }}
                    onKeyDown={event => handleInputKeyDown(event, 'rate')}
                    disabled={!editable}
                    aria-label="Savings target rate"
                    className="min-w-0 bg-transparent p-0 text-center text-foreground outline-none caret-white disabled:cursor-default"
                    style={{ width: `${Math.max(rateInput.length || 1, 1)}ch` }}
                  />
                  <span>%</span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  <Rm amount={roundedMonthlyAmount} />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-baseline justify-center gap-2 text-4xl font-bold tracking-tight text-foreground">
                  <span>RM</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amountInput}
                    onChange={event => handleAmountChange(event.target.value)}
                    onFocus={event => {
                      setEditingField('amount')
                      handleSelectAll(event)
                    }}
                    onBlur={() => {
                      commitAmountInput(amountInput)
                      setEditingField(null)
                    }}
                    onKeyDown={event => handleInputKeyDown(event, 'amount')}
                    disabled={!editable}
                    aria-label="Savings target amount"
                    className="min-w-0 bg-transparent p-0 text-center text-foreground outline-none caret-white disabled:cursor-default"
                    style={{ width: `${Math.max(amountInput.length || 1, 1)}ch` }}
                  />
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{savingsRate}%</div>
              </>
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            onClick={() => onChange(Math.min(savingsRate + 1, 80))}
            disabled={!editable}
            className="rounded-full"
            aria-label="Increase savings target"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <TabsList className="w-full rounded-md border border-border bg-background p-1">
          <TabsTrigger
            value="rate"
            className="rounded-[7px] data-[state=active]:border-border data-[state=active]:bg-secondary dark:data-[state=active]:bg-secondary data-[state=active]:text-foreground"
          >
            Target rate
          </TabsTrigger>
          <TabsTrigger
            value="amount"
            className="rounded-[7px] data-[state=active]:border-border data-[state=active]:bg-secondary dark:data-[state=active]:bg-secondary data-[state=active]:text-foreground"
          >
            Monthly amount
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
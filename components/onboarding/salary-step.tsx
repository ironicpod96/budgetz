'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { calculateTakeHome, formatCurrencyFull } from '@/lib/types'
import { Rm } from '@/components/ui/currency'
import { ChevronRight } from 'lucide-react'

interface SalaryStepProps {
  onNext: (grossIncome: number, epfRate: number) => void
  initialGross: number
  initialEpfRate: number
}

export function SalaryStep({ onNext, initialGross, initialEpfRate }: SalaryStepProps) {
  const [grossIncome, setGrossIncome] = useState(initialGross > 0 ? initialGross.toString() : '')
  const [epfRate, setEpfRate] = useState(initialEpfRate)
  const [deductions, setDeductions] = useState<ReturnType<typeof calculateTakeHome> | null>(null)

  useEffect(() => {
    const income = parseFloat(grossIncome)
    if (income > 0) {
      setDeductions(calculateTakeHome(income, epfRate))
    } else {
      setDeductions(null)
    }
  }, [grossIncome, epfRate])

  const handleSubmit = () => {
    const income = parseFloat(grossIncome)
    if (income > 0) {
      onNext(income, epfRate)
    }
  }

  return (
    <div className="flex-1 flex flex-col px-6 pb-8">
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          What&apos;s your salary?
        </h1>
        <p className="text-muted-foreground mb-8">
          We&apos;ll calculate your take-home pay including EPF, SOCSO, EIS, and PCB.
        </p>

        {/* Gross Income Input */}
        <div className="mb-6">
          <label className="text-sm text-muted-foreground mb-2 block">
            Monthly Gross Income
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
              RM
            </span>
            <input
              type="number"
              value={grossIncome}
              onChange={e => setGrossIncome(e.target.value)}
              placeholder="0"
              className="w-full bg-card text-foreground text-2xl font-semibold rounded-2xl px-4 py-4 pl-14 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>
        </div>

        {/* EPF Rate */}
        <div className="mb-8">
          <label className="text-sm text-muted-foreground mb-3 block">
            EPF Contribution Rate
          </label>
          <div className="flex gap-3">
            {[9, 11, 13].map(rate => (
              <button
                key={rate}
                onClick={() => setEpfRate(rate)}
                className={`flex-1 py-3 rounded-xl font-medium transition-all duration-200 ${
                  epfRate === rate
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground border border-border hover:border-primary/50'
                }`}
              >
                {rate}%
              </button>
            ))}
          </div>
        </div>

        {/* Deductions Breakdown */}
        {deductions && (
          <div className="bg-card rounded-2xl p-5 border border-border">
            <h3 className="text-sm text-muted-foreground mb-4">Monthly Deductions</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">EPF ({epfRate}%)</span>
                <span className="text-foreground">- <Rm amount={deductions.epf} decimals /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SOCSO</span>
                <span className="text-foreground">- <Rm amount={deductions.socso} decimals /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">EIS</span>
                <span className="text-foreground">- <Rm amount={deductions.eis} decimals /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PCB (Est. Tax)</span>
                <span className="text-foreground">- <Rm amount={deductions.pcb} decimals /></span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">Take-Home Salary</span>
                <span className="text-2xl font-bold text-primary">
                  <Rm amount={deductions.takeHome} decimals />
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Continue Button */}
      <Button
        onClick={handleSubmit}
        disabled={!deductions || deductions.takeHome <= 0}
        className="w-full h-14 text-lg font-semibold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all duration-200"
      >
        Continue
        <ChevronRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  )
}

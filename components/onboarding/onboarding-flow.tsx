'use client'

import { useState } from 'react'
import { SalaryStep } from './salary-step'
import { BudgetStep } from './budget-step'
import { FixedExpensesStep } from './fixed-expenses-step'
import { createClient } from '@/lib/supabase/client'
import {
  isSavingsTargetRateColumnMissing,
  persistSavingsTargetRate,
  resolveSavingsTargetRate,
} from '@/lib/savings-target'
import { calculateTakeHome, DEFAULT_CATEGORIES } from '@/lib/types'
import type { Profile, BudgetCategory, FixedExpense } from '@/lib/types'

interface OnboardingFlowProps {
  onComplete: () => void
  initialProfile?: Profile | null
  initialCategories?: BudgetCategory[]
  initialFixedExpenses?: FixedExpense[]
}

export function OnboardingFlow({ onComplete, initialProfile, initialCategories = [], initialFixedExpenses = [] }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Prefill from existing profile/data when available
  const prefillGross = Number(initialProfile?.gross_income ?? 0)
  const prefillEpf = Number(initialProfile?.epf_rate ?? 11)
  const prefillTakeHome = prefillGross > 0
    ? calculateTakeHome(prefillGross, prefillEpf).takeHome
    : 0
  const prefillSavingsRate = resolveSavingsTargetRate(initialProfile?.savings_target_rate)
  const prefillFixedExpenses = initialFixedExpenses.map(e => ({ name: e.name, amount: Number(e.amount) }))
  const prefillCategories = DEFAULT_CATEGORIES.map(c => {
    const existing = initialCategories.find(ec => ec.name === c.name)
    return { ...c, budget: existing ? Number(existing.budget_amount) : 0 }
  })

  const [data, setData] = useState({
    grossIncome: prefillGross,
    epfRate: prefillEpf,
    takeHome: prefillTakeHome,
    categories: prefillCategories,
    fixedExpenses: prefillFixedExpenses,
    savingsRate: prefillSavingsRate,
  })

  const handleSalaryComplete = (grossIncome: number, epfRate: number) => {
    const { takeHome } = calculateTakeHome(grossIncome, epfRate)
    setData(prev => ({ ...prev, grossIncome, epfRate, takeHome }))
    setStep(1)
  }

  const handleFixedComplete = (
    fixedExpenses: { name: string; amount: number }[],
    savingsRate: number
  ) => {
    setData(prev => ({ ...prev, fixedExpenses, savingsRate }))
    setStep(2)
  }

  const handleBudgetComplete = async (categories: { name: string; budget: number; icon: string; color: string }[]) => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('Not authenticated')

      const deductions = calculateTakeHome(data.grossIncome, data.epfRate)
      const updatedAt = new Date().toISOString()
      persistSavingsTargetRate(data.savingsRate)

      // Upsert profile — handles both missing rows and existing rows
      const profilePayload = {
        id: user.id,
        gross_income: data.grossIncome,
        epf_rate: data.epfRate,
        socso_amount: deductions.socso,
        eis_amount: deductions.eis,
        pcb_amount: deductions.pcb,
        take_home_salary: deductions.takeHome,
        onboarding_completed: true,
        updated_at: updatedAt,
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          ...profilePayload,
          savings_target_rate: data.savingsRate,
        })

      if (profileError) {
        if (isSavingsTargetRateColumnMissing(profileError)) {
          const { error: fallbackProfileError } = await supabase
            .from('profiles')
            .upsert(profilePayload)

          if (fallbackProfileError) throw fallbackProfileError
        } else {
          throw profileError
        }
      }

      // Clear and reinsert variable categories (safe for both first-time and re-run)
      await supabase.from('budget_categories').delete().eq('user_id', user.id).eq('is_fixed', false)

      const categoriesToInsert = categories
        .filter(c => c.budget > 0)
        .map(c => ({
          user_id: user.id,
          name: c.name,
          budget_amount: c.budget,
          icon: c.icon,
          color: c.color,
          is_fixed: false,
        }))

      if (categoriesToInsert.length > 0) {
        const { error: catError } = await supabase.from('budget_categories').insert(categoriesToInsert)
        if (catError) throw catError
      }

      // Clear and reinsert fixed expenses
      await supabase.from('fixed_expenses').delete().eq('user_id', user.id)

      if (data.fixedExpenses.length > 0) {
        const fixedToInsert = data.fixedExpenses.map(f => ({
          user_id: user.id,
          name: f.name,
          amount: f.amount,
        }))
        const { error: fixedError } = await supabase.from('fixed_expenses').insert(fixedToInsert)
        if (fixedError) throw fixedError
      }

      onComplete()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { message?: string })?.message ?? JSON.stringify(error)
      console.error('Onboarding error:', message, error)
      setSubmitError(message || 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = [
    <SalaryStep 
      key="salary" 
      onNext={handleSalaryComplete}
      initialGross={data.grossIncome}
      initialEpfRate={data.epfRate}
    />,
    <FixedExpensesStep 
      key="fixed" 
      takeHome={data.takeHome}
      initialExpenses={data.fixedExpenses}
      initialSavingsRate={data.savingsRate}
      onNext={handleFixedComplete}
      onBack={() => setStep(0)}
      isSubmitting={false}
    />,
    <BudgetStep 
      key="budget-final" 
      takeHome={data.takeHome}
      fixedExpensesTotal={data.fixedExpenses.reduce((sum, expense) => sum + expense.amount, 0)}
      savingsRate={data.savingsRate}
      categories={data.categories}
      onNext={handleBudgetComplete}
      onBack={() => setStep(1)}
      isSubmitting={isSubmitting}
    />,
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress indicator */}
      <div className="px-6 pt-12 pb-4">
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div key={step} className="flex-1 flex flex-col">
        {submitError && (
          <p className="mx-6 mt-2 text-sm text-destructive">{submitError}</p>
        )}
        {steps[step]}
      </div>
    </div>
  )
}

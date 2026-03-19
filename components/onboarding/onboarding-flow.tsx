'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SalaryStep } from './salary-step'
import { BudgetStep } from './budget-step'
import { FixedExpensesStep } from './fixed-expenses-step'
import { createClient } from '@/lib/supabase/client'
import { calculateTakeHome, DEFAULT_CATEGORIES } from '@/lib/types'

interface OnboardingFlowProps {
  onComplete: () => void
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [data, setData] = useState({
    grossIncome: 0,
    epfRate: 11,
    takeHome: 0,
    categories: DEFAULT_CATEGORIES.map(c => ({ ...c, budget: 0 })),
    fixedExpenses: [] as { name: string; amount: number }[],
  })

  const handleSalaryComplete = (grossIncome: number, epfRate: number) => {
    const { takeHome } = calculateTakeHome(grossIncome, epfRate)
    setData(prev => ({ ...prev, grossIncome, epfRate, takeHome }))
    setStep(1)
  }

  const handleBudgetComplete = (categories: { name: string; budget: number; icon: string; color: string }[]) => {
    setData(prev => ({ ...prev, categories }))
    setStep(2)
  }

  const handleFixedComplete = async (fixedExpenses: { name: string; amount: number }[]) => {
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('Not authenticated')

      const deductions = calculateTakeHome(data.grossIncome, data.epfRate)

      // Update profile
      await supabase
        .from('profiles')
        .update({
          gross_income: data.grossIncome,
          epf_rate: data.epfRate,
          socso_amount: deductions.socso,
          eis_amount: deductions.eis,
          pcb_amount: deductions.pcb,
          take_home_salary: deductions.takeHome,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      // Insert categories
      const categoriesToInsert = data.categories
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
        await supabase.from('budget_categories').insert(categoriesToInsert)
      }

      // Insert fixed expenses
      if (fixedExpenses.length > 0) {
        const fixedToInsert = fixedExpenses.map(f => ({
          user_id: user.id,
          name: f.name,
          amount: f.amount,
        }))
        await supabase.from('fixed_expenses').insert(fixedToInsert)
      }

      onComplete()
    } catch (error) {
      console.error('Onboarding error:', error)
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
    <BudgetStep 
      key="budget" 
      takeHome={data.takeHome}
      categories={data.categories}
      onNext={handleBudgetComplete}
      onBack={() => setStep(0)}
    />,
    <FixedExpensesStep 
      key="fixed" 
      onNext={handleFixedComplete}
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
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="flex-1 flex flex-col"
        >
          {steps[step]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

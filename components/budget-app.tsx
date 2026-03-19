'use client'

import { useState, useEffect } from 'react'
import { BudgetProvider } from '@/lib/budget-context'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'
import { Dashboard } from '@/components/dashboard/dashboard'
import type { Profile, BudgetCategory, FixedExpense } from '@/lib/types'
import { mutate } from 'swr'

interface BudgetAppProps {
  initialProfile: Profile | null
  initialCategories?: BudgetCategory[]
  initialFixedExpenses?: FixedExpense[]
}

// Consider setup complete if onboarding_completed flag is set OR if salary data already exists
function isSetupComplete(profile: Profile | null): boolean {
  if (!profile) return false
  return profile.onboarding_completed || (profile.gross_income != null && profile.gross_income > 0)
}

export function BudgetApp({ initialProfile, initialCategories = [], initialFixedExpenses = [] }: BudgetAppProps) {
  const [showOnboarding, setShowOnboarding] = useState(
    !isSetupComplete(initialProfile)
  )

  useEffect(() => {
    if (!isSetupComplete(initialProfile)) {
      setShowOnboarding(true)
    }
  }, [initialProfile])

  const handleOnboardingComplete = async () => {
    // Refresh profile data
    await mutate('profile')
    await mutate('categories')
    setShowOnboarding(false)
  }

  if (showOnboarding) {
    return (
      <OnboardingFlow
        onComplete={handleOnboardingComplete}
        initialProfile={initialProfile}
        initialCategories={initialCategories}
        initialFixedExpenses={initialFixedExpenses}
      />
    )
  }

  return (
    <BudgetProvider>
      <Dashboard />
    </BudgetProvider>
  )
}

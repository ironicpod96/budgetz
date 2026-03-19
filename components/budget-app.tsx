'use client'

import { useState, useEffect } from 'react'
import { BudgetProvider } from '@/lib/budget-context'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'
import { Dashboard } from '@/components/dashboard/dashboard'
import type { Profile } from '@/lib/types'
import { mutate } from 'swr'

interface BudgetAppProps {
  initialProfile: Profile | null
}

export function BudgetApp({ initialProfile }: BudgetAppProps) {
  const [showOnboarding, setShowOnboarding] = useState(
    !initialProfile?.onboarding_completed
  )

  useEffect(() => {
    if (initialProfile && !initialProfile.onboarding_completed) {
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
    return <OnboardingFlow onComplete={handleOnboardingComplete} />
  }

  return (
    <BudgetProvider>
      <Dashboard />
    </BudgetProvider>
  )
}

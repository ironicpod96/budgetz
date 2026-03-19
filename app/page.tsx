import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BudgetApp } from '@/components/budget-app'

export default async function Home() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Get profile to check onboarding status
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return <BudgetApp initialProfile={profile} />
}

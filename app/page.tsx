import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BudgetApp } from '@/components/budget-app'

export default async function Home() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // One-time rename: Entertainment → Fun
  await supabase
    .from('budget_categories')
    .update({ name: 'Fun' })
    .eq('user_id', user.id)
    .eq('name', 'Entertainment')

  // Fetch profile, categories and fixed expenses in parallel
  const [{ data: profile }, { data: categories }, { data: fixedExpenses }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('budget_categories').select('*').eq('user_id', user.id).order('name'),
    supabase.from('fixed_expenses').select('*').eq('user_id', user.id).order('name'),
  ])

  return (
    <BudgetApp
      initialProfile={profile}
      initialCategories={categories ?? []}
      initialFixedExpenses={fixedExpenses ?? []}
    />
  )
}

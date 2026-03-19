'use client'

import { createContext, useContext, useCallback, type ReactNode } from 'react'
import useSWR, { mutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { Profile, BudgetCategory, Transaction, FixedExpense } from '@/lib/types'

interface BudgetContextValue {
  profile: Profile | null
  categories: BudgetCategory[]
  transactions: Transaction[]
  fixedExpenses: FixedExpense[]
  isLoading: boolean
  error: Error | null
  refreshData: () => Promise<void>
  addTransaction: (data: { categoryId: string; amount: number; name?: string }) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
}

const BudgetContext = createContext<BudgetContextValue | null>(null)

const fetcher = async (key: string) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  if (key === 'profile') {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (error) throw error
    return data
  }

  if (key === 'categories') {
    const { data, error } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('is_fixed', { ascending: false })
      .order('name')
    if (error) throw error
    return data || []
  }

  if (key === 'transactions') {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, category:budget_categories(*)')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  if (key === 'fixed_expenses') {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
    if (error) throw error
    return data || []
  }

  return null
}

export function BudgetProvider({ children }: { children: ReactNode }) {
  const { data: profile, error: profileError, isLoading: profileLoading } = useSWR<Profile>('profile', fetcher)
  const { data: categories = [], error: categoriesError, isLoading: categoriesLoading } = useSWR<BudgetCategory[]>('categories', fetcher)
  const { data: transactions = [], error: transactionsError, isLoading: transactionsLoading } = useSWR<Transaction[]>('transactions', fetcher)
  const { data: fixedExpenses = [], error: fixedError, isLoading: fixedLoading } = useSWR<FixedExpense[]>('fixed_expenses', fetcher)

  const isLoading = profileLoading || categoriesLoading || transactionsLoading || fixedLoading
  const error = profileError || categoriesError || transactionsError || fixedError

  const refreshData = useCallback(async () => {
    await Promise.all([
      mutate('profile'),
      mutate('categories'),
      mutate('transactions'),
      mutate('fixed_expenses'),
    ])
  }, [])

  const addTransaction = useCallback(async (data: { categoryId: string; amount: number; name?: string }) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('Not authenticated')

    const now = new Date()
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const { error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        category_id: data.categoryId,
        amount: data.amount,
        name: data.name || null,
        transaction_date: localDate,
      })

    if (error) throw error
    await mutate('transactions')
  }, [])

  const deleteTransaction = useCallback(async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) throw error
    await mutate('transactions')
  }, [])

  return (
    <BudgetContext.Provider
      value={{
        profile: profile ?? null,
        categories,
        transactions,
        fixedExpenses,
        isLoading,
        error: error ?? null,
        refreshData,
        addTransaction,
        deleteTransaction,
      }}
    >
      {children}
    </BudgetContext.Provider>
  )
}

export function useBudget() {
  const context = useContext(BudgetContext)
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider')
  }
  return context
}

'use client'

import { useEffect, useRef, useState, type FocusEvent } from 'react'
import { CategoryLabel } from '@/components/category-label'
import { SavingsTargetControl } from '@/components/savings-target-control'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { ScreenTitle, SectionCaption } from '@/components/ui/typography'
import { createClient } from '@/lib/supabase/client'
import {
  isSavingsTargetRateColumnMissing,
  persistSavingsTargetRate,
  resolveSavingsTargetRate,
} from '@/lib/savings-target'
import { calculateTakeHome } from '@/lib/types'
import { Rm } from '@/components/ui/currency'
import type { Profile, FixedExpense, BudgetCategory } from '@/lib/types'
import { LogOut, RefreshCw, Plus, X } from 'lucide-react'
import { mutate } from 'swr'
import { toast } from 'sonner'

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
  profile: Profile | null
  fixedExpenses: FixedExpense[]
  categories: BudgetCategory[]
}

interface EditableExpense {
  id?: string
  name: string
  amount: number
}

interface EditableCategory {
  id: string
  name: string
  budget_amount: number
  icon: string | null
  color: string | null
}

const DISPLAY_NAME_STORAGE_KEY = 'budget:display-name'
const DEFAULT_DISPLAY_NAME = 'Username'

function formatEditableCurrency(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return ''
  const digits = String(value).replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('en-MY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return fallback
}

function getStoredDisplayName() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(DISPLAY_NAME_STORAGE_KEY)?.trim() || ''
}

function persistDisplayName(name: string) {
  if (typeof window === 'undefined') return

  const trimmedName = name.trim()
  if (trimmedName) {
    window.localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, trimmedName)
  } else {
    window.localStorage.removeItem(DISPLAY_NAME_STORAGE_KEY)
  }
}

export function SettingsSheet({ open, onClose, profile, fixedExpenses, categories }: SettingsSheetProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingFixed, setIsSavingFixed] = useState(false)
  const [isSavingSavings, setIsSavingSavings] = useState(false)
  const [isSavingVariable, setIsSavingVariable] = useState(false)

  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isEditingFixed, setIsEditingFixed] = useState(false)
  const [isEditingVariable, setIsEditingVariable] = useState(false)

  const [displayName, setDisplayName] = useState(() => getStoredDisplayName() || DEFAULT_DISPLAY_NAME)
  const [nameInput, setNameInput] = useState(() => getStoredDisplayName())
  const [grossIncomeInput, setGrossIncomeInput] = useState('')
  const [epfRateInput, setEpfRateInput] = useState('11')
  const [hasEditedName, setHasEditedName] = useState(false)
  const [hasEditedGrossIncome, setHasEditedGrossIncome] = useState(false)
  const [hasEditedEpfRate, setHasEditedEpfRate] = useState(false)

  const [editableExpenses, setEditableExpenses] = useState<EditableExpense[]>([])
  const [editableCategories, setEditableCategories] = useState<EditableCategory[]>([])
  const [newExpenseName, setNewExpenseName] = useState('')
  const [newExpenseAmount, setNewExpenseAmount] = useState('')
  const [savingsRate, setSavingsRate] = useState(20)
  const savingsRateRef = useRef(20)
  const optimisticSavingsRateRef = useRef<number | null>(null)
  const queuedSavingsRateRef = useRef<number | null>(null)
  const isSavingSavingsRef = useRef(false)

  useEffect(() => {
    if (!open) return

    const resolvedProfileSavingsRate = resolveSavingsTargetRate(profile?.savings_target_rate)
    const activeSavingsRate = optimisticSavingsRateRef.current
    if (activeSavingsRate !== null) {
      if (Math.abs(resolvedProfileSavingsRate - activeSavingsRate) < 0.001) {
        optimisticSavingsRateRef.current = null
        setSavingsRate(resolvedProfileSavingsRate)
      } else {
        setSavingsRate(activeSavingsRate)
      }
    } else {
      setSavingsRate(resolvedProfileSavingsRate)
    }

    setEditableExpenses(
      fixedExpenses.map(expense => ({
        id: expense.id,
        name: expense.name,
        amount: Number(expense.amount),
      }))
    )
    setEditableCategories(
      categories
        .filter(category => !category.is_fixed)
        .map(category => ({
          id: category.id,
          name: category.name,
          budget_amount: Number(category.budget_amount),
          icon: category.icon,
          color: category.color,
        }))
    )
    setGrossIncomeInput(formatEditableCurrency(profile?.gross_income))
    setEpfRateInput(String(profile?.epf_rate ?? 11))

    setIsEditingProfile(false)
    setIsEditingFixed(false)
    setIsEditingVariable(false)
    setHasEditedName(false)
    setHasEditedGrossIncome(false)
    setHasEditedEpfRate(false)
    setNewExpenseName('')
    setNewExpenseAmount('')
  }, [open, fixedExpenses, categories, profile?.gross_income, profile?.epf_rate, profile?.savings_target_rate])

  useEffect(() => {
    savingsRateRef.current = savingsRate
  }, [savingsRate])

  useEffect(() => {
    if (!open) return

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const fullName = ((data.user?.user_metadata?.full_name as string | undefined) || '').trim()
      const nextDisplayName = fullName || getStoredDisplayName() || DEFAULT_DISPLAY_NAME

      setDisplayName(nextDisplayName)
      setNameInput(fullName || getStoredDisplayName())

      if (fullName) {
        persistDisplayName(fullName)
      }
    })
  }, [open])

  const takeHome = Number(profile?.take_home_salary || 0)
  const grossIncome = Number(profile?.gross_income || 0)
  const epfRate = Number(profile?.epf_rate || 11)
  const originalGrossIncomeInput = formatEditableCurrency(profile?.gross_income)
  const originalEpfRateInput = String(profile?.epf_rate ?? 11)
  const epfAmount = grossIncome * (epfRate / 100)
  const socsoAmount = Number(profile?.socso_amount || 0)
  const eisAmount = Number(profile?.eis_amount || 0)
  const pcbAmount = Number(profile?.pcb_amount || 0)
  const monthlyDeductions = epfAmount + socsoAmount + eisAmount + pcbAmount

  const totalFixedExpenses = editableExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const totalVariableBudget = editableCategories.reduce((sum, category) => sum + category.budget_amount, 0)
  const savingsTargetAmount = (takeHome * savingsRate) / 100
  const availableVariableBudget = Math.max(takeHome - totalFixedExpenses - savingsTargetAmount, 0)
  const variableBudgetDelta = availableVariableBudget - totalVariableBudget

  const resetFixedState = () => {
    setEditableExpenses(
      fixedExpenses.map(expense => ({
        id: expense.id,
        name: expense.name,
        amount: Number(expense.amount),
      }))
    )
    optimisticSavingsRateRef.current = null
    setSavingsRate(resolveSavingsTargetRate(profile?.savings_target_rate))
    setNewExpenseName('')
    setNewExpenseAmount('')
  }

  const resetVariableState = () => {
    setEditableCategories(
      categories
        .filter(category => !category.is_fixed)
        .map(category => ({
          id: category.id,
          name: category.name,
          budget_amount: Number(category.budget_amount),
          icon: category.icon,
          color: category.color,
        }))
    )
  }

  const handleAddExpense = () => {
    const amount = parseFloat(newExpenseAmount)
    const name = newExpenseName.trim()
    if (!name || !Number.isFinite(amount) || amount <= 0) return

    setEditableExpenses(prev => [...prev, { name, amount }])
    setNewExpenseName('')
    setNewExpenseAmount('')
  }

  const handleRemoveExpense = (index: number) => {
    setEditableExpenses(prev => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  const handleUpdateExpense = (index: number, field: 'name' | 'amount', value: string) => {
    setEditableExpenses(prev => {
      const updated = [...prev]
      if (field === 'name') {
        updated[index] = { ...updated[index], name: value }
      } else {
        updated[index] = { ...updated[index], amount: parseFloat(value) || 0 }
      }
      return updated
    })
  }

  const handleUpdateCategoryBudget = (index: number, value: string) => {
    setEditableCategories(prev => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        budget_amount: parseFloat(value) || 0,
      }
      return updated
    })
  }

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const gross = parseFloat(grossIncomeInput.replace(/,/g, ''))
      const epf = parseFloat(epfRateInput)
      if (!Number.isFinite(gross) || gross <= 0) throw new Error('Gross income must be greater than 0.')
      if (!Number.isFinite(epf) || epf < 0 || epf > 100) throw new Error('EPF rate must be between 0 and 100.')

      const deductions = calculateTakeHome(gross, epf)

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          gross_income: gross,
          epf_rate: epf,
          socso_amount: deductions.socso,
          eis_amount: deductions.eis,
          pcb_amount: deductions.pcb,
          take_home_salary: deductions.takeHome,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      const trimmedName = nameInput.trim()
      const { error: userError } = await supabase.auth.updateUser({
        data: {
          full_name: trimmedName || null,
        },
      })
      if (userError) throw userError

      persistDisplayName(trimmedName)
      setDisplayName(trimmedName || DEFAULT_DISPLAY_NAME)
      setNameInput(trimmedName)
      setGrossIncomeInput(formatEditableCurrency(gross))
      setEpfRateInput(String(epf))
      setIsEditingProfile(false)
      await mutate('profile')
      toast.success('Profile updated.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save profile.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleCancelProfile = () => {
    setNameInput(displayName === DEFAULT_DISPLAY_NAME ? '' : displayName)
    setGrossIncomeInput(formatEditableCurrency(profile?.gross_income))
    setEpfRateInput(String(profile?.epf_rate ?? 11))
    setHasEditedName(false)
    setHasEditedGrossIncome(false)
    setHasEditedEpfRate(false)
    setIsEditingProfile(false)
  }

  const handleStartProfileEdit = () => {
    setNameInput(displayName === DEFAULT_DISPLAY_NAME ? '' : displayName)
    setGrossIncomeInput(formatEditableCurrency(profile?.gross_income))
    setEpfRateInput(String(profile?.epf_rate ?? 11))
    setHasEditedName(false)
    setHasEditedGrossIncome(false)
    setHasEditedEpfRate(false)
    setIsEditingProfile(true)
  }

  const handleSelectAllOnFocus = (event: FocusEvent<HTMLInputElement>) => {
    event.currentTarget.select()
  }

  const handleSaveFixed = async () => {
    setIsSavingFixed(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const cleanedExpenses = editableExpenses
        .map(expense => ({ name: expense.name.trim(), amount: Number(expense.amount) }))
        .filter(expense => expense.name.length > 0 && expense.amount > 0)

      await supabase.from('fixed_expenses').delete().eq('user_id', user.id)

      if (cleanedExpenses.length > 0) {
        const { error: insertError } = await supabase.from('fixed_expenses').insert(
          cleanedExpenses.map(expense => ({
            user_id: user.id,
            name: expense.name,
            amount: expense.amount,
          }))
        )
        if (insertError) throw insertError
      }

      await mutate('fixed_expenses')
      setIsEditingFixed(false)
      toast.success('Fixed expenses updated.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save fixed expenses.')
    } finally {
      setIsSavingFixed(false)
    }
  }

  const handleCancelFixed = () => {
    resetFixedState()
    setIsEditingFixed(false)
  }

  const syncSavingsRate = async () => {
    const nextRate = queuedSavingsRateRef.current
    if (nextRate === null) {
      isSavingSavingsRef.current = false
      setIsSavingSavings(false)
      return
    }

    queuedSavingsRateRef.current = null
    isSavingSavingsRef.current = true
    setIsSavingSavings(true)

    const updatedAt = new Date().toISOString()

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          savings_target_rate: nextRate,
          onboarding_completed: true,
          updated_at: updatedAt,
        })

      const hasQueuedUpdate = queuedSavingsRateRef.current !== null

      if (error) {
        if (isSavingsTargetRateColumnMissing(error)) {
          if (!hasQueuedUpdate) {
            await mutate('profile', {
              id: profile?.id ?? user.id,
              gross_income: profile?.gross_income ?? null,
              epf_rate: profile?.epf_rate ?? 11,
              socso_amount: profile?.socso_amount ?? 0,
              eis_amount: profile?.eis_amount ?? 0,
              pcb_amount: profile?.pcb_amount ?? 0,
              take_home_salary: profile?.take_home_salary ?? null,
              savings_target_rate: nextRate,
              onboarding_completed: true,
              created_at: profile?.created_at ?? updatedAt,
              updated_at: updatedAt,
            }, false)
          }
        } else {
          throw error
        }
      } else if (!hasQueuedUpdate) {
        await mutate('profile', {
          id: profile?.id ?? user.id,
          gross_income: profile?.gross_income ?? null,
          epf_rate: profile?.epf_rate ?? 11,
          socso_amount: profile?.socso_amount ?? 0,
          eis_amount: profile?.eis_amount ?? 0,
          pcb_amount: profile?.pcb_amount ?? 0,
          take_home_salary: profile?.take_home_salary ?? null,
          savings_target_rate: nextRate,
          onboarding_completed: true,
          created_at: profile?.created_at ?? updatedAt,
          updated_at: updatedAt,
        }, false)
        void mutate('profile')
      }

      if (queuedSavingsRateRef.current !== null) {
        await syncSavingsRate()
        return
      }
    } catch (error) {
      const fallbackRate = resolveSavingsTargetRate(profile?.savings_target_rate)
      queuedSavingsRateRef.current = null
      optimisticSavingsRateRef.current = null
      persistSavingsTargetRate(fallbackRate)
      savingsRateRef.current = fallbackRate
      setSavingsRate(fallbackRate)
      toast.error(getErrorMessage(error, 'Failed to save savings target.'))
    } finally {
      if (queuedSavingsRateRef.current === null) {
        isSavingSavingsRef.current = false
        setIsSavingSavings(false)
      }
    }
  }

  const handleSavingsRateChange = (nextRate: number) => {
    if (nextRate === savingsRateRef.current) return

    persistSavingsTargetRate(nextRate)
    optimisticSavingsRateRef.current = nextRate
    savingsRateRef.current = nextRate
    setSavingsRate(nextRate)
    queuedSavingsRateRef.current = nextRate

    if (!isSavingSavingsRef.current) {
      void syncSavingsRate()
    }
  }

  const handleSaveVariable = async () => {
    setIsSavingVariable(true)

    try {
      const supabase = createClient()
      const updates = editableCategories.map(category =>
        supabase
          .from('budget_categories')
          .update({
            budget_amount: Number(category.budget_amount),
          })
          .eq('id', category.id)
      )

      const results = await Promise.all(updates)
      const failed = results.find(result => result.error)
      if (failed?.error) throw failed.error

      await mutate('categories')
      setIsEditingVariable(false)
      toast.success('Variable expenses updated.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save variable expenses.')
    } finally {
      setIsSavingVariable(false)
    }
  }

  const handleCancelVariable = () => {
    resetVariableState()
    setIsEditingVariable(false)
  }

  // Smart rebalance: reduce savings rate to cover over-allocation
  const handleReduceSavingsForOverallocation = () => {
    const overAmount = Math.abs(variableBudgetDelta) // variableBudgetDelta is negative
    if (variableBudgetDelta >= 0 || takeHome <= 0) return

    const newSavingsAmount = Math.max(0, savingsTargetAmount - overAmount)
    const newRate = Math.max(0, Math.round((newSavingsAmount / takeHome) * 100 * 100) / 100)

    handleSavingsRateChange(newRate)
    toast.success(`Savings target reduced to ${newRate}%`)
  }

  // Smart rebalance: trim categories proportionally to fit available budget
  const handleTrimCategories = async () => {
    if (variableBudgetDelta >= 0 || editableCategories.length === 0 || availableVariableBudget <= 0) return

    // Scale all categories down proportionally so they sum to availableVariableBudget
    const scaleFactor = availableVariableBudget / totalVariableBudget
    const updatedCategories = editableCategories.map(cat => ({
      ...cat,
      budget_amount: Math.round(cat.budget_amount * scaleFactor * 100) / 100,
    }))

    setEditableCategories(updatedCategories)

    try {
      const supabase = createClient()
      const updates = updatedCategories.map(category =>
        supabase
          .from('budget_categories')
          .update({ budget_amount: Number(category.budget_amount) })
          .eq('id', category.id)
      )
      const results = await Promise.all(updates)
      const failed = results.find(result => result.error)
      if (failed?.error) throw failed.error

      await mutate('categories')
      toast.success('Categories trimmed to fit budget')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update categories.')
    }
  }

  // Smart rebalance: absorb unallocated delta into savings rate
  const handleAddDeltaToSavings = () => {
    if (variableBudgetDelta <= 0 || takeHome <= 0) return

    // Calculate the new savings rate that absorbs the remaining delta
    // savingsTargetAmount + delta = takeHome × newRate / 100
    const newSavingsAmount = savingsTargetAmount + variableBudgetDelta
    const newRate = Math.min(80, Math.round((newSavingsAmount / takeHome) * 100 * 100) / 100)

    handleSavingsRateChange(newRate)
    toast.success(`Savings target adjusted to ${newRate}%`)
  }

  // Smart rebalance: spread unallocated delta proportionally across categories
  const handleSpreadAcrossCategories = async () => {
    if (variableBudgetDelta <= 0 || editableCategories.length === 0) return

    const totalCurrentBudget = editableCategories.reduce((sum, c) => sum + c.budget_amount, 0)

    const updatedCategories = editableCategories.map(cat => {
      // Weight by existing budget share; if all zero, distribute equally
      const weight = totalCurrentBudget > 0
        ? cat.budget_amount / totalCurrentBudget
        : 1 / editableCategories.length
      const addition = Math.round(variableBudgetDelta * weight * 100) / 100

      return {
        ...cat,
        budget_amount: Math.round((cat.budget_amount + addition) * 100) / 100,
      }
    })

    setEditableCategories(updatedCategories)

    // Persist immediately
    try {
      const supabase = createClient()
      const updates = updatedCategories.map(category =>
        supabase
          .from('budget_categories')
          .update({ budget_amount: Number(category.budget_amount) })
          .eq('id', category.id)
      )
      const results = await Promise.all(updates)
      const failed = results.find(result => result.error)
      if (failed?.error) throw failed.error

      await mutate('categories')
      toast.success('Budget spread across categories')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update categories.')
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = '/auth/login'
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleResetOnboarding = async () => {
    if (!confirm('This will reset your budget setup. Are you sure?')) return

    setIsResetting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: false })
          .eq('id', user.id)

        await supabase.from('budget_categories').delete().eq('user_id', user.id)
        await supabase.from('fixed_expenses').delete().eq('user_id', user.id)
        await supabase.from('transactions').delete().eq('user_id', user.id)

        await mutate('profile')
        onClose()
      }
    } finally {
      setIsResetting(false)
    }
  }

  if (!open) return null

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="px-6 pt-12 pb-4 flex items-center justify-between">
        <ScreenTitle className="text-foreground">Manage</ScreenTitle>
        <button
          onClick={onClose}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close settings"
        >
          <X className="h-6 w-6" />
        </button>
      </header>

      <div className="px-6 space-y-6">
        <div className="bg-card rounded-3xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              {isEditingProfile ? (
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => {
                    setNameInput(e.target.value)
                    setHasEditedName(true)
                  }}
                  onFocus={handleSelectAllOnFocus}
                  placeholder=""
                  className="w-full min-w-0 truncate bg-transparent p-0 leading-none text-xl font-semibold text-foreground outline-none placeholder:text-muted-foreground caret-white cursor-text"
                />
              ) : (
                <h2 className="truncate text-xl font-semibold text-foreground">
                  {displayName || nameInput || DEFAULT_DISPLAY_NAME}
                </h2>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isEditingProfile ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancelProfile}
                    className="h-auto px-0 text-base font-medium text-destructive hover:text-destructive/90"
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="h-auto px-0 text-base font-medium text-foreground hover:text-foreground/90"
                  >
                    Done
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto px-0 text-base font-medium"
                  onClick={handleStartProfileEdit}
                >
                  Edit
                </Button>
              )}
            </div>
          </div>

          {isEditingProfile ? (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <SectionCaption>Monthly Income</SectionCaption>
                  <div className="flex items-baseline gap-2 text-xl font-semibold leading-none">
                    <span className={`${hasEditedGrossIncome ? 'text-foreground' : 'text-muted-foreground'}`}>
                      RM
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={grossIncomeInput}
                      onChange={e => {
                        setGrossIncomeInput(formatEditableCurrency(e.target.value))
                        setHasEditedGrossIncome(true)
                      }}
                      onFocus={handleSelectAllOnFocus}
                      className={`min-w-0 flex-1 bg-transparent p-0 leading-none outline-none caret-white cursor-text ${hasEditedGrossIncome ? 'text-foreground' : 'text-muted-foreground'}`}
                      placeholder=""
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <SectionCaption>EPF Contribution</SectionCaption>
                  <div className="flex items-baseline gap-1 text-xl font-semibold leading-none">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={epfRateInput}
                      onChange={e => {
                        setEpfRateInput(e.target.value.replace(/\D/g, ''))
                        setHasEditedEpfRate(true)
                      }}
                      onFocus={handleSelectAllOnFocus}
                      className={`bg-transparent p-0 leading-none outline-none caret-white cursor-text ${hasEditedEpfRate ? 'text-foreground' : 'text-muted-foreground'}`}
                      style={{ width: `${Math.max(epfRateInput.length || 1, 1)}ch` }}
                      placeholder=""
                    />
                    <span className={`${hasEditedEpfRate ? 'text-foreground' : 'text-muted-foreground'}`}>
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 border-t border-border pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <SectionCaption>Monthly Income</SectionCaption>
                  <p className="mt-1 text-xl font-semibold text-foreground"><Rm amount={grossIncome} /></p>
                </div>
                <div>
                  <SectionCaption>EPF Contribution</SectionCaption>
                  <p className="mt-1 text-xl font-semibold text-foreground">{epfRate}%</p>
                </div>
              </div>
            </div>
          )}

          <Accordion type="multiple" className="w-full border-t border-border pt-1">
            <AccordionItem value="deductions" className="border-border">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex w-full items-center justify-between">
                  <span className="text-base font-medium text-foreground">Monthly Deductions</span>
                  <span className="text-base font-semibold text-foreground"><Rm amount={monthlyDeductions} /></span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">EPF ({epfRate}%)</span><span><Rm amount={epfAmount} decimals /></span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SOCSO</span><span><Rm amount={socsoAmount} decimals /></span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">EIS</span><span><Rm amount={eisAmount} decimals /></span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">PCB</span><span><Rm amount={pcbAmount} decimals /></span></div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="bg-card rounded-3xl border border-border p-5 space-y-1">
          <div className="flex items-center justify-between py-1">
            <span className="text-xl font-semibold text-foreground">Take-Home</span>
            <span className="text-lg font-semibold text-foreground"><Rm amount={takeHome} /></span>
          </div>

          <Accordion type="multiple" className="w-full">
            <AccordionItem value="fixed" className="border-border">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex w-full items-center justify-between">
                  <span className="text-base font-medium text-foreground">Fixed Expenses</span>
                  <span className="text-base font-semibold text-foreground"><Rm amount={totalFixedExpenses} /></span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="space-y-2">
                  {editableExpenses.length === 0 && (
                    <p className="text-sm text-muted-foreground">No fixed expenses yet.</p>
                  )}
                  {editableExpenses.map((expense, index) => (
                    <div key={`${expense.id || 'new'}-${index}`} className="flex items-center gap-2">
                      {isEditingFixed ? (
                        <>
                          <Input
                            type="text"
                            value={expense.name}
                            onChange={e => handleUpdateExpense(index, 'name', e.target.value)}
                            className="flex-1"
                          />
                          <InputGroup className="w-28">
                            <InputGroupAddon>
                              <InputGroupText>RM</InputGroupText>
                            </InputGroupAddon>
                            <InputGroupInput
                              type="number"
                              value={expense.amount || ''}
                              onChange={e => handleUpdateExpense(index, 'amount', e.target.value)}
                              className="text-right"
                            />
                          </InputGroup>
                          <Button type="button" variant="outline" size="icon-sm" onClick={() => handleRemoveExpense(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <div className="flex w-full justify-between text-sm">
                          <span className="text-foreground">{expense.name}</span>
                          <span className="text-muted-foreground"><Rm amount={expense.amount} decimals /></span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {isEditingFixed && (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newExpenseName}
                      onChange={e => setNewExpenseName(e.target.value)}
                      className="flex-1"
                      placeholder="New fixed expense"
                    />
                    <InputGroup className="w-28">
                      <InputGroupAddon>
                        <InputGroupText>RM</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        type="number"
                        value={newExpenseAmount}
                        onChange={e => setNewExpenseAmount(e.target.value)}
                        className="text-right"
                        placeholder="0"
                      />
                    </InputGroup>
                    <Button type="button" variant="outline" size="icon-sm" onClick={handleAddExpense}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  {isEditingFixed ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCancelFixed}
                        className="h-auto px-0 text-base font-medium text-destructive hover:text-destructive/90"
                      >
                        Reset
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleSaveFixed}
                        disabled={isSavingFixed}
                        className="h-auto px-0 text-base font-medium text-foreground hover:text-foreground/90"
                      >
                        Done
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 rounded-full px-4 text-sm font-medium"
                      onClick={() => setIsEditingFixed(true)}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="savings" className="border-border">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex w-full items-center justify-between">
                  <span className="text-base font-medium text-foreground">Savings Target · {savingsRate}%</span>
                  <span className="text-base font-semibold text-foreground"><Rm amount={savingsTargetAmount} /></span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <SavingsTargetControl
                  savingsRate={savingsRate}
                  takeHome={takeHome}
                  onChange={handleSavingsRateChange}
                  editable
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="variable" className="border-border">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex w-full items-center justify-between">
                  <span className="text-base font-medium text-foreground">Variable Expenses</span>
                  <span className="text-base font-semibold text-foreground"><Rm amount={availableVariableBudget} /></span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className={`space-y-2 text-sm ${Math.abs(variableBudgetDelta) > 0.01 ? 'border-b border-border pb-3' : ''}`}>
                  {Math.abs(variableBudgetDelta) > 0.01 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {variableBudgetDelta >= 0 ? 'Left to allocate' : 'Over allocated'}
                      </span>
                      <span className={variableBudgetDelta >= 0 ? 'text-foreground' : 'text-destructive'}>
                        <Rm amount={Math.abs(variableBudgetDelta)} decimals />
                      </span>
                    </div>
                  )}
                </div>

                {/* Smart rebalance prompt */}
                {(variableBudgetDelta > 0.01 || variableBudgetDelta < -0.01) && !isEditingVariable && (
                  <div className="flex items-center gap-1 py-1">
                    <span className="text-sm text-muted-foreground mr-auto">Rebalance:</span>
                    {variableBudgetDelta > 0.01 ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 rounded-full px-3 text-xs font-medium"
                          onClick={handleAddDeltaToSavings}
                        >
                          + Savings
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 rounded-full px-3 text-xs font-medium"
                          onClick={handleSpreadAcrossCategories}
                        >
                          Spread
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 rounded-full px-3 text-xs font-medium"
                          onClick={handleReduceSavingsForOverallocation}
                        >
                          - Savings
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 rounded-full px-3 text-xs font-medium"
                          onClick={handleTrimCategories}
                        >
                          Trim
                        </Button>
                      </>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {editableCategories.length === 0 && (
                    <p className="text-sm text-muted-foreground">No variable categories yet.</p>
                  )}
                  {editableCategories.map((category, index) => (
                    <div key={category.id} className="flex items-center gap-3">
                      <CategoryLabel
                        name={category.name}
                        icon={category.icon}
                        size="md"
                        colorClassName="text-foreground"
                        className="min-w-0 flex-1"
                      />

                      {isEditingVariable ? (
                        <InputGroup className="w-28">
                          <InputGroupAddon>
                            <InputGroupText>RM</InputGroupText>
                          </InputGroupAddon>
                          <InputGroupInput
                            type="number"
                            value={category.budget_amount || ''}
                            onChange={e => handleUpdateCategoryBudget(index, e.target.value)}
                            className="text-right"
                          />
                        </InputGroup>
                      ) : (
                        <span className="text-muted-foreground"><Rm amount={category.budget_amount} decimals /></span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  {isEditingVariable ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCancelVariable}
                        className="h-auto px-0 text-base font-medium text-destructive hover:text-destructive/90"
                      >
                        Reset
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleSaveVariable}
                        disabled={isSavingVariable}
                        className="h-auto px-0 text-base font-medium text-foreground hover:text-foreground/90"
                      >
                        Done
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 rounded-full px-4 text-sm font-medium"
                      onClick={() => setIsEditingVariable(true)}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="space-y-3 pb-4">
          <Button
            onClick={handleResetOnboarding}
            disabled={isResetting}
            variant="outline"
            className="w-full justify-start gap-3 h-12 bg-card border-border hover:bg-secondary text-foreground"
          >
            <RefreshCw className={`h-5 w-5 ${isResetting ? 'animate-spin' : ''}`} />
            Reset Budget Setup
          </Button>

          <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            variant="outline"
            className="w-full justify-start gap-3 h-12 bg-card border-border hover:bg-destructive/10 text-destructive hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
            {isLoggingOut ? 'Logging out...' : 'Log Out'}
          </Button>
        </div>
      </div>
    </div>
  )
}

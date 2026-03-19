export interface Profile {
  id: string
  gross_income: number | null
  epf_rate: number
  socso_amount: number
  eis_amount: number
  pcb_amount: number
  take_home_salary: number | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface BudgetCategory {
  id: string
  user_id: string
  name: string
  budget_amount: number
  icon: string | null
  color: string | null
  is_fixed: boolean
  created_at: string
}

export interface FixedExpense {
  id: string
  user_id: string
  name: string
  amount: number
  due_day: number | null
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  category_id: string | null
  amount: number
  name: string | null
  transaction_date: string
  created_at: string
  category?: BudgetCategory
}

export interface OnboardingData {
  grossIncome: number
  epfRate: number
  categories: {
    name: string
    budget: number
    icon: string
  }[]
  fixedExpenses: {
    name: string
    amount: number
  }[]
}

export const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: 'utensils', color: '#FF9F0A' },
  { name: 'Groceries', icon: 'shopping-cart', color: '#32D74B' },
  { name: 'Transport', icon: 'car', color: '#FF3B30' },
  { name: 'Personal', icon: 'user', color: '#5E5CE6' },
  { name: 'Health', icon: 'heart', color: '#FF2D55' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#BF5AF2' },
  { name: 'Entertainment', icon: 'film', color: '#64D2FF' },
  { name: 'Bills', icon: 'file-text', color: '#FFD60A' },
]

// Malaysian tax calculation helpers
export function calculateEPF(grossIncome: number, rate: number = 11): number {
  return grossIncome * (rate / 100)
}

export function calculateSOCSO(grossIncome: number): number {
  // SOCSO rates based on salary brackets (simplified)
  if (grossIncome <= 1200) return grossIncome * 0.005
  if (grossIncome <= 2000) return grossIncome * 0.005
  if (grossIncome <= 3000) return grossIncome * 0.005
  if (grossIncome <= 4000) return 19.75
  if (grossIncome <= 5000) return 23.65
  return Math.min(grossIncome * 0.005, 69.05) // Max SOCSO contribution
}

export function calculateEIS(grossIncome: number): number {
  // EIS is 0.2% of salary, max RM4,000 salary cap
  const cappedSalary = Math.min(grossIncome, 4000)
  return cappedSalary * 0.002
}

export function calculatePCB(grossIncome: number, epf: number): number {
  // Simplified PCB calculation (Monthly Tax Deduction)
  const annualIncome = grossIncome * 12
  const annualEPF = epf * 12
  const taxableIncome = annualIncome - annualEPF - 9000 // Basic relief

  if (taxableIncome <= 5000) return 0
  if (taxableIncome <= 20000) return ((taxableIncome - 5000) * 0.01) / 12
  if (taxableIncome <= 35000) return (150 + (taxableIncome - 20000) * 0.03) / 12
  if (taxableIncome <= 50000) return (600 + (taxableIncome - 35000) * 0.06) / 12
  if (taxableIncome <= 70000) return (1500 + (taxableIncome - 50000) * 0.11) / 12
  if (taxableIncome <= 100000) return (3700 + (taxableIncome - 70000) * 0.19) / 12
  return (9400 + (taxableIncome - 100000) * 0.25) / 12
}

export function calculateTakeHome(
  grossIncome: number,
  epfRate: number = 11
): {
  epf: number
  socso: number
  eis: number
  pcb: number
  takeHome: number
} {
  const epf = calculateEPF(grossIncome, epfRate)
  const socso = calculateSOCSO(grossIncome)
  const eis = calculateEIS(grossIncome)
  const pcb = calculatePCB(grossIncome, epf)
  const takeHome = grossIncome - epf - socso - eis - pcb

  return {
    epf: Math.round(epf * 100) / 100,
    socso: Math.round(socso * 100) / 100,
    eis: Math.round(eis * 100) / 100,
    pcb: Math.round(pcb * 100) / 100,
    takeHome: Math.round(takeHome * 100) / 100,
  }
}

export function formatCurrency(amount: number): string {
  return `RM${amount.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function formatCurrencyFull(amount: number): string {
  return `RM${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

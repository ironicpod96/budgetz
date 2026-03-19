export interface Profile {
  id: string
  gross_income: number | null
  epf_rate: number
  socso_amount: number
  eis_amount: number
  pcb_amount: number
  take_home_salary: number | null
  savings_target_rate: number | null
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
  { name: 'Fun', icon: 'film', color: '#64D2FF' },
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
  // PCB calculation based on progressive tax table
  const annualIncome = grossIncome * 12
  const taxableIncome = Math.max(annualIncome - 9000, 0)

  const taxBrackets = [
    { upperLimit: 5000, firstAmount: 0, baseTax: 0, nextRate: 0 },
    { upperLimit: 20000, firstAmount: 5000, baseTax: 0, nextRate: 0.01 },
    { upperLimit: 35000, firstAmount: 20000, baseTax: 150, nextRate: 0.03 },
    { upperLimit: 50000, firstAmount: 35000, baseTax: 600, nextRate: 0.06 },
    { upperLimit: 70000, firstAmount: 50000, baseTax: 1500, nextRate: 0.11 },
    { upperLimit: 100000, firstAmount: 70000, baseTax: 3700, nextRate: 0.19 },
    { upperLimit: 400000, firstAmount: 100000, baseTax: 9400, nextRate: 0.25 },
    { upperLimit: 600000, firstAmount: 400000, baseTax: 84400, nextRate: 0.26 },
    { upperLimit: 2000000, firstAmount: 600000, baseTax: 136400, nextRate: 0.28 },
  ]

  for (const bracket of taxBrackets) {
    if (taxableIncome <= bracket.upperLimit) {
      const annualTax = bracket.baseTax + (taxableIncome - bracket.firstAmount) * bracket.nextRate
      return annualTax / 12
    }
  }

  const annualTax = 528400 + (taxableIncome - 2000000) * 0.3
  return annualTax / 12
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
  return `RM ${Math.abs(amount).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function formatCurrencyFull(amount: number): string {
  return `RM ${Math.abs(amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

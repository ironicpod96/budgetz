const SAVINGS_TARGET_RATE_STORAGE_KEY = 'budget:savings-target-rate'

function parseSavingsRate(value: unknown): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  if (parsed < 0 || parsed > 80) return null
  return parsed
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return ''
}

export function getStoredSavingsTargetRate(): number | null {
  if (typeof window === 'undefined') return null
  return parseSavingsRate(window.localStorage.getItem(SAVINGS_TARGET_RATE_STORAGE_KEY))
}

export function persistSavingsTargetRate(rate: number) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SAVINGS_TARGET_RATE_STORAGE_KEY, String(rate))
}

export function resolveSavingsTargetRate(rate: number | null | undefined, fallback = 20) {
  return parseSavingsRate(rate) ?? getStoredSavingsTargetRate() ?? fallback
}

export function isSavingsTargetRateColumnMissing(error: unknown) {
  const message = getErrorMessage(error).toLowerCase()
  return message.includes("could not find the 'savings_target_rate' column")
    || (message.includes('savings_target_rate') && message.includes('schema cache'))
}

import { PDFParse } from 'pdf-parse'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'

interface BudgetSuggestion {
  category: string
  amount: number
  reasoning: string
}

interface BudgetAnalysisResult {
  suggestions: BudgetSuggestion[]
  insights: string
  diagnostics?: {
    source: 'ollama' | 'rule-based'
    parsedExpenseLines: number
    matchedCategoryLines: number
    uncategorizedExpenseLines: number
  }
}

function safeParseCategories(rawCategories: FormDataEntryValue | null): string[] {
  if (typeof rawCategories !== 'string' || rawCategories.trim().length === 0) {
    return []
  }

  try {
    const parsed = JSON.parse(rawCategories)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map(item => String(item).trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function normalizeAmount(rawAmount: string): number {
  const cleaned = rawAmount.replace(/,/g, '').trim()

  if (/^\(.*\)$/.test(cleaned)) {
    const absoluteValue = Number(cleaned.replace(/[()]/g, ''))
    return Number.isFinite(absoluteValue) ? -absoluteValue : 0
  }

  const value = Number(cleaned)
  return Number.isFinite(value) ? value : 0
}

function extractExpenseAmountFromLine(line: string): number | null {
  const rawMatches = line.match(/(?<!\d)-?\(?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\)?|(?<!\d)-?\(?\d+(?:\.\d{1,2})?\)?/g)
  if (!rawMatches || rawMatches.length === 0) return null

  const normalized = rawMatches
    .map(raw => ({ raw, value: normalizeAmount(raw) }))
    .filter(item => Number.isFinite(item.value))

  const negativeAmount = normalized.find(item => item.value < 0)
  if (negativeAmount) {
    return Math.abs(negativeAmount.value)
  }

  const hasDebitSignal = /(\bdr\b|debit|purchase|payment|pos|qrpay|duitnow|e-commerce|spent)/i.test(line)
  const hasCreditSignal = /(\bcr\b|credit|salary|refund|interest|deposit|incoming|received)/i.test(line)

  if (hasDebitSignal && !hasCreditSignal) {
    const decimalLike = normalized
      .filter(item => /[.,]/.test(item.raw))
      .map(item => Math.abs(item.value))
      .filter(value => value > 0)

    if (decimalLike.length > 0) {
      return decimalLike[0]
    }
  }

  return null
}

function inferCategoryFromDescription(description: string, categories: string[]): string | null {
  const normalized = description.toLowerCase()

  const rules: Array<{ pattern: RegExp; hints: string[] }> = [
    { pattern: /(rent|sewa|utility|electric|water|internet|telco|bill|tm|unifi|maxis|celcom|indah water)/, hints: ['Bills', 'Utilities'] },
    { pattern: /(grab|taxi|lrt|mrt|fuel|petrol|tng|touch n go|toll|parking|transport|car)/, hints: ['Transport'] },
    { pattern: /(grocer|grocery|lotus|tesco|aeon|mydin|jaya grocer|99 speedmart)/, hints: ['Groceries', 'Food'] },
    { pattern: /(food|dining|restaurant|cafe|kopitiam|mcd|kfc|tealive|starbucks|meal)/, hints: ['Food', 'Dining'] },
    { pattern: /(shopee|lazada|zalora|shopping|mall|store|retail)/, hints: ['Shopping', 'Personal'] },
    { pattern: /(clinic|hospital|pharmacy|guardian|watsons|health|medical)/, hints: ['Health'] },
    { pattern: /(movie|cinema|netflix|spotify|entertainment|game|fun)/, hints: ['Fun'] },
  ]

  for (const rule of rules) {
    if (!rule.pattern.test(normalized)) continue

    const matched = categories.find(category =>
      rule.hints.some(hint => hint.toLowerCase() === category.toLowerCase())
    )

    if (matched) return matched
  }

  return null
}

async function extractTextByFileType(file: File): Promise<{ text: string; notes: string[] }> {
  const fileName = file.name.toLowerCase()
  const notes: string[] = []

  const decodeAsText = async (): Promise<string> => {
    try {
      return await file.text()
    } catch {
      const bytes = new Uint8Array(await file.arrayBuffer())
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    }
  }

  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    try {
      const fileBuffer = Buffer.from(await file.arrayBuffer())
      const parser = new PDFParse({ data: fileBuffer })
      const parsed = await parser.getText()
      await parser.destroy()
      const text = parsed.text || ''

      if (text.trim().length === 0) {
        notes.push('PDF has no extractable text (possibly scanned image).')
      }

      return { text, notes }
    } catch {
      notes.push('PDF parser failed; falling back to basic text decode.')
      const fallbackText = await decodeAsText()
      return { text: fallbackText, notes }
    }
  }

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    try {
      const workbookBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(new Uint8Array(workbookBuffer), { type: 'array' })
      const textBlocks = workbook.SheetNames.slice(0, 3).map(sheetName => {
        const sheet = workbook.Sheets[sheetName]
        return XLSX.utils.sheet_to_csv(sheet)
      })

      return { text: textBlocks.join('\n'), notes }
    } catch {
      notes.push('Spreadsheet parser failed; falling back to basic text decode.')
      const fallbackText = await decodeAsText()
      return { text: fallbackText, notes }
    }
  }

  return { text: await decodeAsText(), notes }
}

function buildSuggestionsFromText(fileText: string, allocatableAmount: number, categories: string[]) {
  const lines = fileText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const spendingByCategory = new Map<string, number>()
  for (const category of categories) {
    spendingByCategory.set(category, 0)
  }

  let parsedExpenseLines = 0
  let matchedCategoryLines = 0
  let uncategorizedExpenseLines = 0

  for (const line of lines) {
    const spendingAmount = extractExpenseAmountFromLine(line)
    if (!spendingAmount || spendingAmount <= 0) continue

    parsedExpenseLines += 1
    const category = inferCategoryFromDescription(line, categories)
    if (!category) {
      uncategorizedExpenseLines += 1
      continue
    }

    matchedCategoryLines += 1
    spendingByCategory.set(category, (spendingByCategory.get(category) || 0) + spendingAmount)
  }

  const totalSpending = Array.from(spendingByCategory.values()).reduce((sum, value) => sum + value, 0)
  const budgetCap = Math.max(allocatableAmount, 0)
  const equalAllocation = categories.length > 0 ? budgetCap / categories.length : 0

  const suggestions = categories.map(category => {
    const historicalSpending = spendingByCategory.get(category) || 0
    const suggestedAmount = totalSpending > 0
      ? (historicalSpending / totalSpending) * budgetCap
      : equalAllocation

    const roundedAmount = Math.max(Math.round(suggestedAmount / 10) * 10, 0)
    return {
      category,
      amount: roundedAmount,
      reasoning: historicalSpending > 0
        ? `Based on detected spending trend of about RM${historicalSpending.toFixed(2)}.`
        : 'No strong pattern detected; allocated a balanced share.',
    }
  })

  const topCategories = [...spendingByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, value]) => value > 0)
    .slice(0, 2)
    .map(([name]) => name)

  const insights = topCategories.length > 0
    ? `Top spending categories detected: ${topCategories.join(', ')}. Suggestions are allocated from the amount remaining after fixed commitments.`
    : 'No clear spending rows were detected from the file, so budgets were evenly distributed from the amount remaining after fixed commitments.'

  return {
    suggestions,
    insights,
    diagnostics: {
      source: 'rule-based' as const,
      parsedExpenseLines,
      matchedCategoryLines,
      uncategorizedExpenseLines,
    },
  }
}

function normalizeOllamaSuggestions(
  rawSuggestions: unknown,
  categories: string[],
  allocatableAmount: number
): BudgetSuggestion[] {
  const categoryMap = new Map(categories.map(name => [name.toLowerCase(), name]))
  const budgetCap = Math.max(allocatableAmount, 0)

  const parsed = Array.isArray(rawSuggestions) ? rawSuggestions : []
  const merged = new Map<string, BudgetSuggestion>()

  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue

    const categoryRaw = 'category' in item ? String(item.category ?? '') : ''
    const canonicalCategory = categoryMap.get(categoryRaw.toLowerCase())
    if (!canonicalCategory) continue

    const amountRaw = 'amount' in item ? Number(item.amount) : 0
    const reasoningRaw = 'reasoning' in item ? String(item.reasoning ?? '') : ''
    const amount = Number.isFinite(amountRaw) ? Math.max(amountRaw, 0) : 0

    merged.set(canonicalCategory, {
      category: canonicalCategory,
      amount,
      reasoning: reasoningRaw || 'Suggested by local Ollama model based on statement patterns.',
    })
  }

  const completed = categories.map(category => merged.get(category) || {
    category,
    amount: 0,
    reasoning: 'No confident match from model output.',
  })

  const currentTotal = completed.reduce((sum, item) => sum + item.amount, 0)
  const scaled = currentTotal > budgetCap && currentTotal > 0
    ? completed.map(item => ({ ...item, amount: item.amount * (budgetCap / currentTotal) }))
    : completed

  return scaled.map(item => ({
    ...item,
    amount: Math.max(Math.round(item.amount / 10) * 10, 0),
  }))
}

async function analyzeWithOllama(
  fileText: string,
  takeHome: number,
  fixedCommitments: number,
  allocatableAmount: number,
  categories: string[]
): Promise<BudgetAnalysisResult> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b'

  const prompt = `You are a budgeting assistant.

Task:
- Analyze spending habits from the statement text.
- Return budget suggestions for these categories only: ${categories.join(', ')}
- Allocate suggestions proportionally to spending habits from statement.
- Total suggested amount must not exceed allocatable amount after fixed commitments.
- Round to nearest RM10.

Take-home salary (RM): ${takeHome.toFixed(2)}
Fixed commitments total (RM): ${fixedCommitments.toFixed(2)}
Allocatable amount after fixed commitments (RM): ${allocatableAmount.toFixed(2)}

Statement text:
${fileText.slice(0, 40000)}

Return JSON only in this shape:
{
  "suggestions": [{"category": "...", "amount": 0, "reasoning": "..."}],
  "insights": "short summary"
}`

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.2,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Ollama request failed (${response.status}): ${errorText.slice(0, 300)}`)
  }

  const body = await response.json() as { response?: string }
  if (!body.response) {
    throw new Error('Ollama returned an empty response payload.')
  }

  const parsed = JSON.parse(body.response) as {
    suggestions?: unknown
    insights?: unknown
  }

  const suggestions = normalizeOllamaSuggestions(parsed.suggestions, categories, allocatableAmount)
  if (!suggestions.length) {
    throw new Error('Ollama did not return usable category suggestions.')
  }

  const insights = typeof parsed.insights === 'string' && parsed.insights.trim().length > 0
    ? parsed.insights.trim()
    : 'Suggestions generated by local Ollama model from detected spending patterns.'

  return {
    suggestions,
    insights,
    diagnostics: {
      source: 'ollama' as const,
      parsedExpenseLines: 0,
      matchedCategoryLines: 0,
      uncategorizedExpenseLines: 0,
    },
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const takeHome = parseFloat(formData.get('takeHome') as string) || 0
    const fixedCommitments = parseFloat(formData.get('fixedCommitments') as string) || 0
    const allocatableFromClient = parseFloat(formData.get('allocatable') as string)
    const categories = safeParseCategories(formData.get('categories'))
    const allocatableAmount = Number.isFinite(allocatableFromClient)
      ? Math.max(allocatableFromClient, 0)
      : Math.max(takeHome - fixedCommitments, 0)

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!categories.length) {
      return Response.json({ error: 'No categories provided' }, { status: 400 })
    }

    const { text: extractedText, notes } = await extractTextByFileType(file)
    const normalizedText = extractedText.slice(0, 150000)

    try {
      const ollamaResult = await analyzeWithOllama(
        normalizedText,
        takeHome,
        fixedCommitments,
        allocatableAmount,
        categories
      )
      if (notes.length > 0) {
        ollamaResult.insights = `${ollamaResult.insights} Note: ${notes.join(' ')}`
      }
      return Response.json(ollamaResult)
    } catch (ollamaError) {
      console.error('Ollama analysis failed, using heuristic fallback:', ollamaError)
    }

    const result = buildSuggestionsFromText(normalizedText, allocatableAmount, categories)
    result.insights = `Ollama unavailable, using local parser fallback. ${result.insights}${notes.length > 0 ? ` Note: ${notes.join(' ')}` : ''}`
    return Response.json(result)
  } catch (error) {
    console.error('Analysis error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return Response.json(
      { error: `Failed to analyze statement: ${errorMessage}` },
      { status: 500 }
    )
  }
}

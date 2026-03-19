'use client'

import { useState, useRef } from 'react'
import { CategoryLabel } from '@/components/category-label'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { formatCurrency } from '@/lib/types'
import { ChevronRight, ChevronLeft, Upload, Sparkles } from 'lucide-react'

interface Category {
  name: string
  budget: number
  icon: string
  color: string
}

interface BudgetStepProps {
  takeHome: number
  fixedExpensesTotal: number
  savingsRate: number
  categories: Category[]
  onNext: (categories: Category[]) => void
  onBack: () => void
  isSubmitting?: boolean
}

export function BudgetStep({
  takeHome,
  fixedExpensesTotal,
  savingsRate,
  categories: initialCategories,
  onNext,
  onBack,
  isSubmitting = false,
}: BudgetStepProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [analysisError, setAnalysisError] = useState<string>('')
  const [analysisSuccess, setAnalysisSuccess] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const savingsTargetAmount = Math.max((takeHome * savingsRate) / 100, 0)
  const totalCommitments = fixedExpensesTotal + savingsTargetAmount
  const allocatableAmount = Math.max(takeHome - totalCommitments, 0)
  const totalBudgeted = categories.reduce((sum, c) => sum + c.budget, 0)
  const remaining = allocatableAmount - totalBudgeted

  const updateBudget = (index: number, value: string) => {
    const budget = parseFloat(value) || 0
    setCategories(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], budget }
      return updated
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setAnalysisError('')
    setAnalysisSuccess('')
    setSelectedFile(file)
  }

  const analyzeStatement = async () => {
    if (!selectedFile) return
    
    setIsAnalyzing(true)
    setAnalysisError('')
    setAnalysisSuccess('')
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('takeHome', takeHome.toString())
      formData.append('fixedCommitments', totalCommitments.toString())
      formData.append('savingsTarget', savingsTargetAmount.toString())
      formData.append('allocatable', allocatableAmount.toString())
      formData.append('categories', JSON.stringify(categories.map(c => c.name)))

      const response = await fetch('/api/analyze-statement', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setAnalysisError(result.error || 'Failed to analyze statement. Please try again.')
        return
      }

      if (!result.suggestions || !Array.isArray(result.suggestions)) {
        setAnalysisError('No suggestions returned from AI. Please try another file.')
        return
      }

      setCategories(prev => prev.map(cat => {
        const suggestion = result.suggestions.find(
          (s: { category: string; amount: number }) =>
            s.category.toLowerCase() === cat.name.toLowerCase()
        )
        return suggestion ? { ...cat, budget: suggestion.amount } : cat
      }))

      const diagnostics = result.diagnostics
      const diagnosticsText = diagnostics
        ? ` (${diagnostics.source === 'ollama' ? 'Ollama' : 'Rule-based'} · parsed ${diagnostics.parsedExpenseLines} expense lines · matched ${diagnostics.matchedCategoryLines})`
        : ''
      setAnalysisSuccess(`Suggestions applied.${diagnosticsText}${result.insights ? ` ${result.insights}` : ''}`)
    } catch (error) {
      console.error('Analysis error:', error)
      setAnalysisError('Unable to analyze statement. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSubmit = () => {
    onNext(categories)
  }

  return (
    <div className="flex-1 flex flex-col px-6 pb-8">
      <div className="flex-1 overflow-auto">
        <button
          onClick={onBack}
          className="flex items-center text-muted-foreground mb-4 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Back
        </button>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          Set your budgets
        </h1>
        <p className="text-muted-foreground mb-6">
          Take-home: <span className="text-primary font-semibold">{formatCurrency(takeHome)}</span> · Fixed expenses: <span className="text-foreground font-semibold">{formatCurrency(fixedExpensesTotal)}</span> · Savings target ({savingsRate}%): <span className="text-foreground font-semibold">{formatCurrency(savingsTargetAmount)}</span> · Available for allocation: <span className="text-primary font-semibold">{formatCurrency(allocatableAmount)}</span>
        </p>

        {/* AI Analysis Button */}
        <div className="bg-card rounded-2xl p-4 border border-border mb-6">
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.csv,.xlsx"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {!selectedFile ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 py-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Upload className="h-5 w-5" />
              <span>Upload bank statement for AI suggestions</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground truncate flex-1">
                  {selectedFile.name}
                </span>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-muted-foreground hover:text-foreground text-sm ml-2"
                >
                  Remove
                </button>
              </div>
              <Button
                onClick={analyzeStatement}
                disabled={isAnalyzing}
                className="w-full bg-primary/10 text-primary hover:bg-primary/20 border-0"
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Suggest budget allocation
                  </>
                )}
              </Button>
              {analysisError && (
                <p className="text-sm text-destructive">{analysisError}</p>
              )}
              {analysisSuccess && (
                <p className="text-sm text-primary">{analysisSuccess}</p>
              )}
            </div>
          )}
        </div>

        {/* Categories */}
        <div className="space-y-3 mb-6">
          {categories.map((category, index) => (
            <div
              key={category.name}
              className="bg-card rounded-xl p-4 border border-border flex items-center gap-4"
            >
              <CategoryLabel
                name={category.name}
                icon={category.icon}
                size="md"
                colorClassName="text-foreground"
                className="flex-1"
              />
              <InputGroup className="w-24">
                <InputGroupAddon>
                  <InputGroupText>RM</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  type="number"
                  value={category.budget || ''}
                  onChange={e => updateBudget(index, e.target.value)}
                  placeholder="0"
                  className="text-right font-medium"
                />
              </InputGroup>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground">Budgeted</span>
            <span className="text-foreground font-medium">{formatCurrency(totalBudgeted)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Remaining</span>
            <span className={`font-medium ${remaining < 0 ? 'text-destructive' : 'text-primary'}`}>
              {formatCurrency(remaining)}
            </span>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full h-14 text-lg font-semibold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 mt-6 disabled:opacity-50"
      >
        {isSubmitting ? 'Setting up...' : (
          <>
            Complete Setup
            <ChevronRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>
    </div>
  )
}

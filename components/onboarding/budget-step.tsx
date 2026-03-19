'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/types'
import { ChevronRight, ChevronLeft, Upload, Sparkles } from 'lucide-react'
import { CategoryIcon } from '@/components/category-icon'

interface Category {
  name: string
  budget: number
  icon: string
  color: string
}

interface BudgetStepProps {
  takeHome: number
  categories: Category[]
  onNext: (categories: Category[]) => void
  onBack: () => void
}

export function BudgetStep({ takeHome, categories: initialCategories, onNext, onBack }: BudgetStepProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalBudgeted = categories.reduce((sum, c) => sum + c.budget, 0)
  const remaining = takeHome - totalBudgeted

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
    
    setSelectedFile(file)
  }

  const analyzeStatement = async () => {
    if (!selectedFile) return
    
    setIsAnalyzing(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('takeHome', takeHome.toString())
      formData.append('categories', JSON.stringify(categories.map(c => c.name)))

      const response = await fetch('/api/analyze-statement', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        if (result.suggestions) {
          setCategories(prev => prev.map(cat => {
            const suggestion = result.suggestions.find(
              (s: { category: string; amount: number }) => 
                s.category.toLowerCase() === cat.name.toLowerCase()
            )
            return suggestion ? { ...cat, budget: suggestion.amount } : cat
          }))
        }
      }
    } catch (error) {
      console.error('Analysis error:', error)
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
          Allocate your take-home salary of <span className="text-primary font-semibold">{formatCurrency(takeHome)}</span> to categories.
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
            </div>
          )}
        </div>

        {/* Categories */}
        <div className="space-y-3 mb-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="bg-card rounded-xl p-4 border border-border flex items-center gap-4"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${category.color}20` }}
              >
                <CategoryIcon name={category.icon} color={category.color} />
              </div>
              <div className="flex-1">
                <span className="text-foreground font-medium">{category.name}</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  RM
                </span>
                <input
                  type="number"
                  value={category.budget || ''}
                  onChange={e => updateBudget(index, e.target.value)}
                  placeholder="0"
                  className="w-24 bg-secondary text-foreground text-right font-medium rounded-lg px-3 py-2 pl-10 border-0 focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </motion.div>
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
        className="w-full h-14 text-lg font-semibold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 mt-6"
      >
        Continue
        <ChevronRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  )
}

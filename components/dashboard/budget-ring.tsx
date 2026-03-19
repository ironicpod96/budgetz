'use client'

import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/types'

interface BudgetRingProps {
  budget: number
  spent: number
  remaining: number
}

export function BudgetRing({ budget, spent, remaining }: BudgetRingProps) {
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  const isOverBudget = spent > budget

  // SVG parameters
  const size = 200
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isOverBudget ? 'var(--destructive)' : 'var(--primary)'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-4xl font-bold ${isOverBudget ? 'text-destructive' : 'text-foreground'}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          {formatCurrency(Math.round(remaining))}
        </motion.span>
        <span className="text-muted-foreground text-sm mt-1">
          {isOverBudget ? 'over budget' : 'left'}
        </span>
      </div>
    </div>
  )
}

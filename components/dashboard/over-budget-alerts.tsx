'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { CategoryIcon } from '@/components/category-icon'
import { Rm } from '@/components/ui/currency'
import { getBarColor } from './category-bars'
import type { BudgetCategory } from '@/lib/types'

interface CategoryWithSpending extends BudgetCategory {
  periodBudget: number
  spent: number
  remaining: number
  percentage: number
}

interface OverBudgetAlertsProps {
  categories: CategoryWithSpending[]
  isExpanded?: boolean
  acknowledged?: boolean
}

// Threshold: orange territory starts at ~50% spent
const ALERT_THRESHOLD = 50

export function OverBudgetAlerts({ categories, isExpanded = false, acknowledged = false }: OverBudgetAlertsProps) {
  const alertCategories = useMemo(
    () => categories.filter(c => c.periodBudget > 0 && c.percentage >= ALERT_THRESHOLD),
    [categories]
  )

  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<'visible' | 'exiting' | 'entering'>('visible')

  // Reset index when alerts change
  useEffect(() => {
    setCurrentIndex(0)
    setPhase('visible')
  }, [alertCategories.length])

  // Auto-carousel when multiple alerts
  useEffect(() => {
    if (alertCategories.length <= 1) return

    const interval = setInterval(() => {
      setPhase('exiting')

      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % alertCategories.length)
        setPhase('entering')

        setTimeout(() => {
          setPhase('visible')
        }, 50)
      }, 300)
    }, 3000)

    return () => clearInterval(interval)
  }, [alertCategories.length])

  if (alertCategories.length === 0) return null

  const cat = alertCategories[currentIndex % alertCategories.length]
  if (!cat) return null

  const isOverBudget = cat.percentage > 100
  const overAmount = cat.spent - cat.periodBudget
  const barColor = getBarColor(cat.percentage)

  // Animation classes
  let animationStyle: React.CSSProperties = {}
  if (phase === 'exiting') {
    animationStyle = {
      transform: 'scale(0.8) translateY(-8px)',
      opacity: 0,
      filter: 'blur(4px)',
      transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
    }
  } else if (phase === 'entering') {
    animationStyle = {
      transform: 'scale(0.8) translateY(8px)',
      opacity: 0,
      filter: 'blur(4px)',
      transition: 'none',
    }
  } else {
    animationStyle = {
      transform: 'scale(1) translateY(0)',
      opacity: 1,
      filter: 'blur(0)',
      transition: 'all 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
    }
  }

  return (
    <div
      className="absolute left-6 bottom-[22px] transition-opacity duration-300"
      style={{ opacity: isExpanded ? 0 : 1, pointerEvents: isExpanded ? 'none' : 'auto' }}
    >
      <div style={animationStyle} className="flex flex-col items-start">
        <CategoryIcon
          name={cat.icon || 'file-text'}
          color={barColor}
          size={32}
          className={acknowledged && isOverBudget ? 'opacity-50' : ''}
        />
        <span
          className={`text-lg font-semibold whitespace-nowrap mt-0.5 ${acknowledged && isOverBudget ? 'opacity-50' : ''}`}
          style={{ color: barColor }}
        >
          {isOverBudget
            ? <>{`> `}<Rm amount={overAmount} rmClassName="text-current" valueClassName="text-current" /></>
            : <><Rm amount={cat.remaining} rmClassName="text-current" valueClassName="text-current" />{` left`}</>
          }
        </span>
      </div>
    </div>
  )
}

'use client'

import { CategoryIcon } from '@/components/category-icon'
import { cn } from '@/lib/utils'

type CategoryLabelSize = 'sm' | 'md' | 'lg'

interface CategoryLabelProps {
  name: string
  icon?: string | null
  className?: string
  textClassName?: string
  iconClassName?: string
  colorClassName?: string
  size?: CategoryLabelSize
}

const sizeStyles: Record<CategoryLabelSize, { icon: number; text: string; gap: string }> = {
  sm: { icon: 18, text: 'text-sm', gap: 'gap-2' },
  md: { icon: 20, text: 'text-base', gap: 'gap-2.5' },
  lg: { icon: 24, text: 'text-lg', gap: 'gap-3' },
}

export function CategoryLabel({
  name,
  icon,
  className,
  textClassName,
  iconClassName,
  colorClassName = 'text-muted-foreground',
  size = 'sm',
}: CategoryLabelProps) {
  const styles = sizeStyles[size]

  return (
    <div className={cn('flex min-w-0 items-center', styles.gap, colorClassName, className)}>
      <CategoryIcon
        name={icon || 'file-text'}
        color="currentColor"
        size={styles.icon}
        className={cn('shrink-0', iconClassName)}
      />
      <span className={cn('truncate', styles.text, textClassName)}>{name}</span>
    </div>
  )
}
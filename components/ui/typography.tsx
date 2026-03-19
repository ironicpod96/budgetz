'use client'

import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const textPrimitives = {
  display: 'text-4xl font-bold tracking-tight',
  title: 'text-xl font-semibold',
  body: 'text-base',
  bodyStrong: 'text-base font-medium',
  caption: 'text-sm text-muted-foreground',
} as const

export const textSemantics = {
  screenTitle: textPrimitives.display,
  sectionCaption: textPrimitives.caption,
  cardTitle: 'text-foreground font-medium',
} as const

interface TypographyProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  children: ReactNode
  className?: string
}

export function ScreenTitle({ as: Component = 'h1', className, children, ...props }: TypographyProps) {
  return (
    <Component className={cn(textSemantics.screenTitle, className)} {...props}>
      {children}
    </Component>
  )
}

export function SectionCaption({ as: Component = 'p', className, children, ...props }: TypographyProps) {
  return (
    <Component className={cn(textSemantics.sectionCaption, className)} {...props}>
      {children}
    </Component>
  )
}

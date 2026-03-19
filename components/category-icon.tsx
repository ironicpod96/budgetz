'use client'

import {
  MdRestaurant,
  MdShoppingCart,
  MdDirectionsCar,
  MdPerson,
  MdFavorite,
  MdShoppingBag,
  MdCelebration,
  MdReceiptLong,
  MdHome,
  MdCreditCard,
  MdWifi,
  MdSmartphone,
  MdFitnessCenter,
  MdMusicNote,
  MdFlight,
  MdCoffee,
} from 'react-icons/md'
import type { IconType } from 'react-icons'
import { cn } from '@/lib/utils'

const iconMap: Record<string, IconType> = {
  utensils: MdRestaurant,
  'shopping-cart': MdShoppingCart,
  car: MdDirectionsCar,
  user: MdPerson,
  heart: MdFavorite,
  'shopping-bag': MdShoppingBag,
  film: MdCelebration,
  'file-text': MdReceiptLong,
  home: MdHome,
  'credit-card': MdCreditCard,
  wifi: MdWifi,
  smartphone: MdSmartphone,
  dumbbell: MdFitnessCenter,
  music: MdMusicNote,
  plane: MdFlight,
  coffee: MdCoffee,
}

const ICON_COLOR = '#FFFFFF'

interface CategoryIconProps {
  name: string
  color?: string
  size?: number
  className?: string
}

export function CategoryIcon({ name, color = ICON_COLOR, size = 18, className }: CategoryIconProps) {
  const Icon = iconMap[name] || MdReceiptLong

  return <Icon size={size} color={color} className={cn(className)} aria-hidden="true" />
}

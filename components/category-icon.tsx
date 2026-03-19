'use client'

import {
  Utensils,
  ShoppingCart,
  Car,
  User,
  Heart,
  ShoppingBag,
  Film,
  FileText,
  Home,
  CreditCard,
  Wifi,
  Smartphone,
  Dumbbell,
  Music,
  Plane,
  Coffee,
  type LucideIcon,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  utensils: Utensils,
  'shopping-cart': ShoppingCart,
  car: Car,
  user: User,
  heart: Heart,
  'shopping-bag': ShoppingBag,
  film: Film,
  'file-text': FileText,
  home: Home,
  'credit-card': CreditCard,
  wifi: Wifi,
  smartphone: Smartphone,
  dumbbell: Dumbbell,
  music: Music,
  plane: Plane,
  coffee: Coffee,
}

interface CategoryIconProps {
  name: string
  color?: string
  size?: number
}

export function CategoryIcon({ name, color = '#FFFFFF', size = 18 }: CategoryIconProps) {
  const Icon = iconMap[name] || FileText
  return <Icon size={size} color={color} />
}

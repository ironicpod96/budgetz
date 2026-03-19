'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { formatCurrencyFull } from '@/lib/types'
import type { Profile } from '@/lib/types'
import { LogOut, User, DollarSign, Calculator, RefreshCw } from 'lucide-react'
import { mutate } from 'swr'

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
  profile: Profile | null
}

export function SettingsSheet({ open, onClose, profile }: SettingsSheetProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleResetOnboarding = async () => {
    if (!confirm('This will reset your budget setup. Are you sure?')) return
    
    setIsResetting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Reset profile
        await supabase
          .from('profiles')
          .update({ onboarding_completed: false })
          .eq('id', user.id)

        // Delete categories and transactions
        await supabase.from('budget_categories').delete().eq('user_id', user.id)
        await supabase.from('fixed_expenses').delete().eq('user_id', user.id)
        await supabase.from('transactions').delete().eq('user_id', user.id)

        // Refresh data
        await mutate('profile')
        onClose()
      }
    } catch (error) {
      console.error('Reset error:', error)
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="bg-background border-border w-full max-w-md">
        <SheetHeader>
          <SheetTitle className="text-foreground">Settings</SheetTitle>
        </SheetHeader>

        <div className="mt-8 space-y-6">
          {/* Profile Section */}
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-medium">Your Profile</p>
                <p className="text-sm text-muted-foreground">Budget settings</p>
              </div>
            </div>

            {profile && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">Gross Income</span>
                  </div>
                  <span className="text-foreground font-medium">
                    {profile.gross_income ? formatCurrencyFull(Number(profile.gross_income)) : 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calculator className="h-4 w-4" />
                    <span className="text-sm">Take-Home</span>
                  </div>
                  <span className="text-primary font-medium">
                    {profile.take_home_salary ? formatCurrencyFull(Number(profile.take_home_salary)) : 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">EPF Rate</span>
                  <span className="text-foreground">{profile.epf_rate || 11}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Deductions Breakdown */}
          {profile && profile.take_home_salary && (
            <div className="bg-card rounded-2xl p-4 border border-border">
              <p className="text-sm text-muted-foreground mb-3">Monthly Deductions</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">EPF</span>
                  <span className="text-foreground">
                    {formatCurrencyFull(Number(profile.gross_income || 0) * (Number(profile.epf_rate || 11) / 100))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SOCSO</span>
                  <span className="text-foreground">
                    {formatCurrencyFull(Number(profile.socso_amount || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">EIS</span>
                  <span className="text-foreground">
                    {formatCurrencyFull(Number(profile.eis_amount || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">PCB (Tax)</span>
                  <span className="text-foreground">
                    {formatCurrencyFull(Number(profile.pcb_amount || 0))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleResetOnboarding}
              disabled={isResetting}
              variant="outline"
              className="w-full justify-start gap-3 h-12 bg-card border-border hover:bg-secondary text-foreground"
            >
              <RefreshCw className={`h-5 w-5 ${isResetting ? 'animate-spin' : ''}`} />
              Reset Budget Setup
            </Button>

            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              variant="outline"
              className="w-full justify-start gap-3 h-12 bg-card border-border hover:bg-destructive/10 text-destructive hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
              {isLoggingOut ? 'Logging out...' : 'Log Out'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

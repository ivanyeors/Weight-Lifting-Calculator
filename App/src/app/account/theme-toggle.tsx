"use client"

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'
import { useUserTier } from '@/hooks/use-user-tier'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { canToggleTheme, currentTier } = useUserTier()
  const router = useRouter()
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  
  const isDark = (resolvedTheme ?? theme) === 'dark'

  const handleThemeToggle = () => {
    if (!canToggleTheme) {
      setShowUpgradeDialog(true)
      return
    }
    
    setTheme(isDark ? 'light' : 'dark')
  }

  const handleUpgrade = () => {
    setShowUpgradeDialog(false)
    router.push('/billing')
  }

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleThemeToggle} 
        aria-label="Toggle theme" 
        title={canToggleTheme ? "Toggle theme" : "Upgrade to toggle theme"}
        className="relative"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Required</DialogTitle>
            <DialogDescription>
              Theme customization is available for Personal and Trainer plans. 
              Upgrade your plan to access light and dark theme options.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="text-sm text-muted-foreground">
              <p>Current plan: <span className="font-medium">{currentTier}</span></p>
              <p>Available themes: Dark only</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpgrade} className="flex-1">
                View Plans
              </Button>
              <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

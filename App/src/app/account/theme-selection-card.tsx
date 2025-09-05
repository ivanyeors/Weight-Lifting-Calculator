"use client"

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Monitor, Moon, Sun, Lock } from 'lucide-react'
import { useUserTier } from '@/hooks/use-user-tier'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ThemeOption {
  id: 'light' | 'dark' | 'system'
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const themeOptions: ThemeOption[] = [
  {
    id: 'light',
    name: 'Light',
    description: 'Clean and bright interface',
    icon: Sun
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Easy on the eyes',
    icon: Moon
  },
  {
    id: 'system',
    name: 'System',
    description: 'Matches your device preference',
    icon: Monitor
  }
]

export function ThemeSelectionCard() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { canToggleTheme, currentTier, allowedThemes } = useUserTier()
  const router = useRouter()
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  
  const currentTheme = theme || 'system'

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    if (!canToggleTheme) {
      setShowUpgradeDialog(true)
      return
    }
    
    setTheme(newTheme)
  }

  const handleUpgrade = () => {
    setShowUpgradeDialog(false)
    router.push('/account?tab=billing#plans')
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Theme Preference
            {!canToggleTheme && (
              <Badge variant="secondary" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Personal+
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {canToggleTheme 
              ? 'Choose your preferred theme appearance' 
              : 'Theme customization available with Personal and Trainer plans'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themeOptions.map((option) => {
              const isSelected = currentTheme === option.id
              const isAvailable = allowedThemes.includes(option.id)
              const IconComponent = option.icon
              
              return (
                <div key={option.id} className="relative">
                  <Button
                    variant="outline"
                    className={`w-full h-auto p-4 flex flex-col items-center gap-3 ${
                      !isAvailable ? 'opacity-50 cursor-not-allowed' : ''
                    } ${isSelected ? 'border-2 border-primary bg-primary/10 hover:bg-primary/15' : 'hover:bg-accent'}`}
                    onClick={() => isAvailable ? handleThemeChange(option.id) : setShowUpgradeDialog(true)}
                    disabled={!isAvailable && canToggleTheme}
                  >
                    <div className={`p-3 rounded-full ${
                      isSelected ? 'bg-primary/20 border border-primary/30' : 'bg-muted'
                    }`}>
                      <IconComponent className={`h-6 w-6 ${
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="text-center">
                      <div className={`font-medium ${isSelected ? 'text-primary font-semibold' : ''}`}>
                        {option.name}
                      </div>
                      <div className={`text-xs mt-1 ${
                        isSelected ? 'text-primary/70' : 'text-muted-foreground'
                      }`}>
                        {option.description}
                      </div>
                    </div>
                    {!isAvailable && (
                      <div className="absolute top-2 right-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </Button>
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-sm">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {!canToggleTheme && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Upgrade to customize themes</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Current plan: <span className="font-medium">{currentTier}</span> • Available themes: Dark only
                  </p>
                  <Button size="sm" className="mt-3" onClick={() => setShowUpgradeDialog(true)}>
                    View upgrade options
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 text-xs text-muted-foreground">
            <p>Current theme: <span className="font-medium capitalize">{currentTheme}</span></p>
            <p>Resolved appearance: <span className="font-medium capitalize">{resolvedTheme || 'loading...'}</span></p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Required</DialogTitle>
            <DialogDescription>
              Theme customization is available for Personal and Trainer plans. 
              Upgrade your plan to access light, dark, and system theme options.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="text-sm text-muted-foreground">
              <p>Current plan: <span className="font-medium">{currentTier}</span></p>
              <p>Available themes: {allowedThemes.join(', ')}</p>
              <p className="mt-2">With Personal or Trainer plan, you get:</p>
              <ul className="list-disc list-inside ml-2 mt-1">
                <li>Light theme</li>
                <li>Dark theme</li>
                <li>System preference matching</li>
              </ul>
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

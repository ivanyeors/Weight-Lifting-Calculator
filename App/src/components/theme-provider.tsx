"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"
import { useUserTier } from "@/hooks/use-user-tier"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const { defaultTheme, allowedThemes, loading } = useUserTier()

  // Don't render until we know the user's tier
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading theme...</p>
        </div>
      </div>
    )
  }

  return (
    <NextThemesProvider 
      {...props} 
      defaultTheme={defaultTheme}
      themes={allowedThemes}
      forcedTheme={allowedThemes.length === 1 ? allowedThemes[0] : undefined}
    >
      {children}
    </NextThemesProvider>
  )
}



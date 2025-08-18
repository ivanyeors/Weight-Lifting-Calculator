"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"
import { useUserTier } from "@/hooks/use-user-tier"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const { defaultTheme, allowedThemes, loading } = useUserTier()

  // Don't render until we know the user's tier
  if (loading) {
    return <div className="min-h-screen bg-background">{children}</div>
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



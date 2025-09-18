"use client"

import { type CSSProperties, useEffect } from "react"
import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SidebarConditionalWrapper } from "@/app/sidebar-conditional-wrapper"
import { MobileDock } from "@/app/(globals)/mobile-dock"
import { FitnessGoalDock } from "@/app/fitness-goal/fitness-goal-dock"
import { supabase } from "@/lib/supabaseClient"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const normalizedPath = (pathname || "").replace(/\/+$/, "") || "/"

  // Public landing pages (no auth required)
  const isPublic = (() => {
    // Treat any path under these roots as public
    if (
      normalizedPath === "/" ||
      normalizedPath === "/fitspo-app" ||
      normalizedPath === "/platform" ||
      normalizedPath.startsWith("/platform/") ||
      (normalizedPath.startsWith("/home/") && normalizedPath !== "/home/") ||
      normalizedPath === "/account" ||
      normalizedPath === "/auth/callback"
    ) {
      return true
    }
    return false
  })()

  // Redirect unauthenticated users away from protected routes to login
  useEffect(() => {
    let cancelled = false
    const guard = async () => {
      try {
        if (isPublic) return
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        if (!session?.user) {
          try {
            const base = ((process.env.NEXT_PUBLIC_BASE_URL as string) || '/').replace(/\/?$/, '/')
            const next = typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : normalizedPath
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('postAuthRedirectTo', next)
              window.location.replace(`${base}account?next=${encodeURIComponent(next)}`)
            }
          } catch {
            // best-effort; ignore
          }
        }
      } catch {
        // ignore
      }
    }
    void guard()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedPath])

  if (isPublic) {
    return <>{children}</>
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "14rem" } as CSSProperties}>
      <SidebarConditionalWrapper />
      <SidebarInset>
        {children}
      </SidebarInset>
      {normalizedPath === "/fitness-goal" ? <FitnessGoalDock /> : <MobileDock />}
    </SidebarProvider>
  )
}

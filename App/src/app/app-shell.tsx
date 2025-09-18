"use client"

import { type CSSProperties } from "react"
import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SidebarConditionalWrapper } from "@/app/sidebar-conditional-wrapper"
import { MobileDock } from "@/app/(globals)/mobile-dock"
import { FitnessGoalDock } from "@/app/fitness-goal/fitness-goal-dock"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const normalizedPath = (pathname || "").replace(/\/+$/, "") || "/"

  if (
    normalizedPath === "/" ||
    normalizedPath === "/fitspo-app" ||
    normalizedPath === "/platform" ||
    normalizedPath === "/platform/privacy" ||
    normalizedPath === "/platform/terms" ||
    normalizedPath === "/platform/pricing" ||
    normalizedPath === "/home"
  ) {
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

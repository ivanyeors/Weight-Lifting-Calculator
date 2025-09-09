"use client"

import { type CSSProperties } from "react"
import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SidebarConditionalWrapper } from "@/app/sidebar-conditional-wrapper"
import { MobileDock } from "@/app/(globals)/mobile-dock"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === "/home") {
    return <>{children}</>
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "14rem" } as CSSProperties}>
      <SidebarConditionalWrapper />
      <SidebarInset>
        {children}
      </SidebarInset>
      <MobileDock />
    </SidebarProvider>
  )
}

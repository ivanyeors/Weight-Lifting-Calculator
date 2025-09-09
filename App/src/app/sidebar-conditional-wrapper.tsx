"use client"

import { usePathname } from "next/navigation"
import { AppSidebar } from "@/app/app-sidebar"

export function SidebarConditionalWrapper() {
  const pathname = usePathname()
  if (pathname === "/home") return null
  return <AppSidebar />
}

"use client"

import { usePathname } from "next/navigation"
import { AppSidebar } from "@/app/app-sidebar"

export function SidebarConditionalWrapper() {
  const pathname = usePathname()
  const normalizedPath = (pathname || "").replace(/\/+$/, "") || "/"
  if (normalizedPath === "/home" || normalizedPath === "/home/privacy" || normalizedPath === "/home/terms") return null
  return <AppSidebar />
}

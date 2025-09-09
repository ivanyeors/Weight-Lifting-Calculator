"use client"

import { usePathname } from "next/navigation"
import { MobileDock } from "@/app/(globals)/mobile-dock"

export function MobileDockWrapper() {
  const pathname = usePathname()
  if (pathname === "/home") return null
  return <MobileDock />
}

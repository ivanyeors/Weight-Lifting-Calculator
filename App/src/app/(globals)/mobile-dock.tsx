"use client"

import { Menu } from "lucide-react"
import { MenuDock } from "@/components/ui/shadcn-io/menu-dock"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSidebar } from "@/components/ui/sidebar"

export function MobileDock() {
  const isMobile = useIsMobile()
  const { toggleSidebar } = useSidebar()

  if (!isMobile) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pb-safe">
      <MenuDock
        items={[{
          label: 'Menu',
          icon: Menu,
          onClick: toggleSidebar,
        }]}
        variant="compact"
        showLabels={false}
        className="bg-background/95 backdrop-blur-sm border border-border/50 shadow-lg rounded-full px-2 py-1"
      />
    </div>
  )
}

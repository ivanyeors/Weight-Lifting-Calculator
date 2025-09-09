"use client"

import { useEffect, useState } from 'react'
import { Home, PanelLeftIcon } from "lucide-react"
import { MenuDock } from "@/components/ui/shadcn-io/menu-dock"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSidebar } from "@/components/ui/sidebar"
import { supabase } from '@/lib/supabaseClient'

export function MobileDock() {
  const isMobile = useIsMobile()
  const { toggleSidebar } = useSidebar()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session?.user)
      } catch (error) {
        console.error('Error checking auth status:', error)
        setIsAuthenticated(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Hide mobile dock when not authenticated
  if (!isMobile || !isAuthenticated) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pb-safe">
      <MenuDock
        items={[
          {
            label: 'Home',
            icon: Home,
            onClick: () => { try { window.location.href = '/home' } catch {} }
          },
          {
            label: 'Sidebar',
            icon: PanelLeftIcon,
            onClick: toggleSidebar,
          }
        ]}
        variant="default"
        showLabels={false}
        className="bg-background/95 backdrop-blur-sm border border-border/50 shadow-lg rounded-full px-2 py-1"
      />
    </div>
  )
}

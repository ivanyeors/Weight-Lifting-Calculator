"use client"

import { useEffect, useState } from 'react'
import { Home, PanelLeftIcon, Dumbbell, Target, Filter, Plus } from "lucide-react"
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
  try {
    const rawPath = typeof window !== 'undefined' ? window.location.pathname : ''
    const normalizedPath = rawPath.replace(/\/+$/, '') || '/'
    const forceShowRoutes = new Set<string>(['/exercise-library', '/ideal-exercise-weight'])
    const shouldForceShow = forceShowRoutes.has(normalizedPath)
    if (!isMobile || (!isAuthenticated && !shouldForceShow)) return null
  } catch {
    if (!isMobile || !isAuthenticated) return null
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 -translate-y-[6px] z-50 pb-safe">
      <MenuDock
        items={(() => {
          const base = [
            {
              label: 'Home',
              icon: Home,
              onClick: () => { try { window.location.href = '/home' } catch {} }
            },
            {
              label: 'Sidebar',
              icon: PanelLeftIcon,
              onClick: toggleSidebar,
            },
          ] as Array<{ label: string; icon: any; onClick: () => void }>

          try {
            const rawPath = typeof window !== 'undefined' ? window.location.pathname : ''
            const pathname = rawPath.replace(/\/+$/, '') || '/'
            const isExerciseLibrary = pathname === '/exercise-library'
            const isIdealExerciseWeight = pathname === '/ideal-exercise-weight'
            if (isExerciseLibrary) {
              base.splice(1, 0,
                {
                  label: 'Filter',
                  icon: Filter,
                  onClick: () => {
                    try { window.dispatchEvent(new CustomEvent('exercise-library:open-filters')) } catch {}
                  }
                },
                {
                  label: 'Add',
                  icon: Plus,
                  onClick: () => {
                    try { window.dispatchEvent(new CustomEvent('exercise-library:open-add')) } catch {}
                  }
                },
              )
            }
            if (isIdealExerciseWeight) {
              base.splice(1, 0,
                {
                  label: 'Filter',
                  icon: Filter,
                  onClick: () => {
                    try { window.dispatchEvent(new CustomEvent('ideal-exercise-weight:open-filters')) } catch {}
                  }
                },
                {
                  label: 'Select',
                  icon: Dumbbell,
                  onClick: () => {
                    try { window.dispatchEvent(new CustomEvent('ideal-exercise-weight:open-select')) } catch {}
                  }
                },
              )
              const targetItem = {
                label: 'Target',
                icon: Target,
                onClick: () => {
                  try { window.dispatchEvent(new CustomEvent('ideal-exercise-weight:scroll-ideal-weight')) } catch {}
                }
              }
              const sidebarIndex = base.findIndex((i) => i.label === 'Sidebar')
              if (sidebarIndex >= 0) {
                base.splice(sidebarIndex, 0, targetItem)
              } else {
                base.push(targetItem)
              }
            }
          } catch {}

          return base
        })()}
        variant="default"
        showLabels={false}
        className="bg-background/95 backdrop-blur-sm border border-border/50 shadow-lg rounded-full px-2 py-1"
      />
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSidebar } from "@/components/ui/sidebar"
import { MenuDock } from "@/components/ui/shadcn-io/menu-dock"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { UserSwitcher } from "@/components/ui/user-switcher"
import { supabase } from "@/lib/supabaseClient"
import { PanelLeftIcon, User2, Plus, ClipboardList } from "lucide-react"

export function FitnessGoalDock() {
  const pathname = usePathname()
  const onFitnessGoal = useMemo(() => (pathname || "").replace(/\/?$/, "") === "/fitness-goal", [pathname])

  const isMobile = useIsMobile()
  const { toggleSidebar } = useSidebar()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userSheetOpen, setUserSheetOpen] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session?.user)
      } catch {
        setIsAuthenticated(false)
      }
    }
    void checkAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthenticated(!!session?.user)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!isMobile || !isAuthenticated || !onFitnessGoal) return null

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pb-safe">
        <MenuDock
          items={[
            {
              label: "Menu",
              icon: PanelLeftIcon,
              onClick: toggleSidebar,
            },
            {
              label: "Select user",
              icon: User2,
              onClick: () => setUserSheetOpen(true),
            },
            {
              label: "Create plan",
              icon: Plus,
              onClick: () => {
                try { if (typeof window !== "undefined") window.dispatchEvent(new Event("fitspo:open_create_plan")) } catch {}
              },
            },
            {
              label: "Plan drawer",
              icon: ClipboardList,
              onClick: () => {
                try { if (typeof window !== "undefined") window.dispatchEvent(new Event("fitspo:open_plan_details")) } catch {}
              },
            },
          ]}
          variant="default"
          showLabels={false}
          className="bg-background/95 backdrop-blur-sm border border-border/50 shadow-lg rounded-full px-2 py-1"
        />
      </div>

      <Sheet open={userSheetOpen} onOpenChange={setUserSheetOpen}>
        <SheetContent
          side="bottom"
          animation="fade"
          className="p-3 sm:p-4 inset-x-0 bottom-0 w-screen max-w-none rounded-t-2xl border-t"
          overlayClassName="!bg-black/40"
        >
          <SheetHeader className="pb-2">
            <SheetTitle className="text-sm">Select user</SheetTitle>
          </SheetHeader>
          <UserSwitcher
            onSelected={() => setUserSheetOpen(false)}
            contentClassName=""
            align="start"
            side="bottom"
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

export default FitnessGoalDock



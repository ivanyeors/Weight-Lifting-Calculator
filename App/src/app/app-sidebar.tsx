"use client"
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LoginForm } from "@/app/account/login-form"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FlickeringGrid } from "@/components/ui/shadcn-io/flickering-grid"
import { supabase } from '@/lib/supabaseClient'
import { TeamSwitcher } from "@/components/ui/team-switcher"

import { Calculator, MapPin, ClipboardList, Dumbbell, AppWindow, ChevronDown, Flame, Users as UsersIcon, UtensilsCrossed, Building2, CheckCircle } from "lucide-react"
import { useTheme } from "next-themes"

type UserInfo = { id: string; email: string | null; name: string | null; avatarUrl: string | null }

export function AppSidebar() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<string>('Free')
  const { theme, resolvedTheme } = useTheme()
  const { state, toggleSidebar } = useSidebar()
  const pathname = usePathname()
  const [fitnessGoalLabel, setFitnessGoalLabel] = useState<{ text: string; className: string } | null>(null)
  const isMobile = useIsMobile()
  const teams = [
    { name: 'Fitspo', logo: AppWindow, plan: currentPlan },
    { name: 'Gym Team', logo: Dumbbell, plan: 'Pro' },
    { name: 'Work', logo: Building2, plan: 'Free' },
  ]

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      const u = data.session?.user ?? null
      setUser(
        u
          ? {
              id: u.id,
              email: u.email ?? null,
              name: (u.user_metadata?.full_name || u.user_metadata?.name || null) as string | null,
              avatarUrl: (u.user_metadata?.avatar_url || null) as string | null,
            }
          : null
      )
      const metaPlan = (u?.user_metadata?.plan as string | undefined) || null
      const storedPlan = typeof window !== 'undefined'
        ? ((localStorage.getItem('fitspo:plan') as string | null) || (localStorage.getItem('stronk:plan') as string | null))
        : null
      setCurrentPlan(metaPlan || storedPlan || 'Free')
    }
    void init()

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      const u = s?.user ?? null
      setUser(
        u
          ? {
              id: u.id,
              email: u.email ?? null,
              name: (u.user_metadata?.full_name || u.user_metadata?.name || null) as string | null,
              avatarUrl: (u.user_metadata?.avatar_url || null) as string | null,
            }
          : null
      )
      const uPlan = (u?.user_metadata?.plan as string | undefined) || null
      const lsPlan = typeof window !== 'undefined'
        ? ((localStorage.getItem('fitspo:plan') as string | null) || (localStorage.getItem('stronk:plan') as string | null))
        : null
      setCurrentPlan(uPlan || lsPlan || 'Free')
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => { if (user && isLoginOpen) setIsLoginOpen(false) }, [user, isLoginOpen])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Clear onboarding status on logout
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fitspo:onboarding_complete');
        localStorage.removeItem('fitspo:onboarding_completed_at');
        localStorage.removeItem('fitspo:selected_user_id');
      }
    } finally {
      const base = ((process.env.NEXT_PUBLIC_BASE_URL as string) || '/').replace(/\/?$/, '/');
      window.location.replace(`${base}`);
    }
  }

  // Compute Fitness Goal label from stored plans
  useEffect(() => {
    const STORAGE_KEY = 'fitspo:plans'
    const SELECTED_USER_KEY = 'fitspo:selected_user_id'

    const compute = () => {
      try {
        if (typeof window === 'undefined') return setFitnessGoalLabel(null)
        const selectedUserId = (localStorage.getItem(SELECTED_USER_KEY) || user?.id || '').trim()
        if (!selectedUserId) return setFitnessGoalLabel(null)
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return setFitnessGoalLabel(null)
        const all = JSON.parse(raw) as Record<string, Array<{ id: string; status: string; durationDays?: number; createdAt?: string }>>
        const plans = all[selectedUserId] || []
        if (!Array.isArray(plans) || plans.length === 0) return setFitnessGoalLabel(null)
        // Prefer active, otherwise paused, otherwise completed
        const plan = plans.find(p => p.status === 'active')
          || plans.find(p => p.status === 'paused')
          || plans.find(p => p.status === 'completed')
        if (!plan) return setFitnessGoalLabel(null)

        if (plan.status === 'paused') {
          return setFitnessGoalLabel({ text: 'pause', className: 'text-muted-foreground border-muted-foreground/40' })
        }
        if (plan.status === 'completed') {
          return setFitnessGoalLabel({ text: '100%', className: 'text-green-600 border-green-600/50' })
        }
        // Active: compute % based on elapsed days over duration
        let percent = 0
        if (plan.durationDays && plan.createdAt) {
          const start = new Date(plan.createdAt).getTime()
          const now = Date.now()
          if (Number.isFinite(start) && plan.durationDays > 0) {
            const elapsedDays = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)))
            percent = Math.min(99, Math.max(0, Math.round((elapsedDays / plan.durationDays) * 100)))
          }
        }
        setFitnessGoalLabel({ text: `${percent}%`, className: 'text-primary border-primary' })
      } catch {
        setFitnessGoalLabel(null)
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === STORAGE_KEY || e.key === SELECTED_USER_KEY) compute()
    }

    compute()
    if (typeof window !== 'undefined') {
      window.addEventListener('fitspo:plans_changed', compute)
      window.addEventListener('fitspo:selected_user_changed', compute)
      window.addEventListener('storage', handleStorage)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('fitspo:plans_changed', compute)
        window.removeEventListener('fitspo:selected_user_changed', compute)
        window.removeEventListener('storage', handleStorage)
      }
    }
  }, [user?.id])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-2">
        {state === 'collapsed' ? (
          <div className="flex flex-col items-center gap-2">
            <img
              src={(resolvedTheme || theme) === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'}
              alt="Fitspo Logo"
              className="h-8 w-8 rounded-[8px]"
            />
            <SidebarTrigger className="h-8 w-8 p-0" />
          </div>
        ) : (
          <div className="mb-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img
                  src={(resolvedTheme || theme) === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'}
                  alt="Fitspo Logo"
                  className="h-8 w-8 rounded-[8px]"
                />
                <div>
                  <h2 className="text-base font-semibold">Fitspo</h2>
                </div>
              </div>
              {!isMobile && <SidebarTrigger className="h-8 w-8 p-0" />}
            </div>
            <div className="mt-2 hidden">
              <TeamSwitcher teams={teams} />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:items-center">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:justify-center">
            App
          </SidebarGroupLabel>
          <SidebarGroupContent className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:w-full">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/fitspo-app'}>
                  <a href="/fitspo-app" className={`flex items-center gap-2 ${pathname === '/fitspo-app' ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''} group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:!border-0`}>
                    <AppWindow />
                    <span className="group-data-[collapsible=icon]:hidden">Fitspo App</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:items-center">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:justify-center">
            Quick Start
          </SidebarGroupLabel>
          <SidebarGroupContent className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:w-full">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/onboard'}>
                  <a href="/onboard" className={`flex items-center gap-2 ${pathname === '/onboard' ? 'bg-accent text-accent-foreground border-l-2 border-primary' : ''} group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:!border-0`}>
                    <CheckCircle />
                    <span className="group-data-[collapsible=icon]:hidden">Get Started</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:items-center">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:justify-center">
            Calculations
          </SidebarGroupLabel>
          <SidebarGroupContent className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:w-full">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/ideal-exercise-weight'}>
                  <a href="/ideal-exercise-weight" className={`flex items-center gap-2 ${pathname === '/ideal-exercise-weight' ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''} group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:!border-0`}>
                    <Calculator />
                    <span className="group-data-[collapsible=icon]:hidden">Exercise weights</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/fitness-goal'}>
                  <a href="/fitness-goal" className={`flex items-center gap-2 ${pathname === '/fitness-goal' ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''} group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:!border-0`}>
                    <Flame />
                    <span className="group-data-[collapsible=icon]:hidden">Fitness Goal</span>
                    {fitnessGoalLabel ? (
                      <Badge variant="outline" className={`ml-auto group-data-[collapsible=icon]:hidden ${fitnessGoalLabel.className}`}>
                        {fitnessGoalLabel.text}
                      </Badge>
                    ) : null}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:items-center">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:justify-center">
            Database
          </SidebarGroupLabel>
          <SidebarGroupContent className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:w-full">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/exercise-library'}>
                  <a href="/exercise-library" className={`flex items-center gap-2 ${pathname === '/exercise-library' ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''} group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:!border-0`}>
                    <Dumbbell />
                    <span className="group-data-[collapsible=icon]:hidden">Exercise Library</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/plans/nutrition'}>
                  <a href="/plans/nutrition" className={`flex items-center gap-2 ${pathname === '/plans/nutrition' ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''} group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:!border-0`}>
                    <UtensilsCrossed />
                    <span className="group-data-[collapsible=icon]:hidden">Nutrition</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/workout-spaces'}>
                  <a href="/workout-spaces" className={`flex items-center gap-2 ${pathname === '/workout-spaces' ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''} group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:!border-0`}>
                    <MapPin />
                    <span className="group-data-[collapsible=icon]:hidden">Workout Spaces</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:items-center">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:justify-center">
            Plans
          </SidebarGroupLabel>
          <SidebarGroupContent className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:w-full">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/plans/users'}>
                  <a href="/plans/users" className={`flex items-center gap-2 ${pathname === '/plans/users' ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''} group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:!border-0`}>
                    <UsersIcon />
                    <span className="group-data-[collapsible=icon]:hidden">Users</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/plans/workout-templates'}>
                  <a href="/plans/workout-templates" className={`flex items-center gap-2 ${pathname === '/plans/workout-templates' ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''} group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:!border-0`}>
                    <ClipboardList />
                    <span className="group-data-[collapsible=icon]:hidden">Workout Templates</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/plans/workout-plans'}>
                  <a href="/plans/workout-plans" className={`flex items-center gap-2 ${pathname === '/plans/workout-plans' ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''} group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:!border-0`}>
                    <ClipboardList />
                    <span className="group-data-[collapsible=icon]:hidden">Fitness Calendar</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {state === 'collapsed' && !isMobile ? null : (
        <SidebarFooter className="p-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between h-12 bg-background border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="size-8">
                      {user.avatarUrl ? (
                        <AvatarImage src={user.avatarUrl} alt={user.name || user.email || 'User'} />
                      ) : (
                        <AvatarFallback>
                          {(user.name || user.email || '?').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-sm font-medium truncate">{user.name || user.email || 'Account'}</span>
                      {user.email && (
                        <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-[260px]" align="center" side="top" sideOffset={8} alignOffset={0}>
                <DropdownMenuLabel className="flex items-center justify-between gap-2">
                  <span className="truncate">{user?.name || user?.email || 'Account'}</span>
                  <Badge variant="secondary" className="ml-2 shrink-0">{currentPlan}</Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); window.location.href = '/account' }}
                  className="cursor-pointer"
                >
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); window.location.href = '/account?tab=billing' }}
                  className="cursor-pointer"
                >
                  Pricing
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setIsLogoutConfirmOpen(true);
                  }}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button className="w-full" onClick={() => setIsLoginOpen(true)}>
              Login
            </Button>
          )}
        </SidebarFooter>
      )}

      <Sheet open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <SheetContent
          side="bottom"
          animation="fade"
          className="p-0 inset-0 w-screen sm:h-dvh h-svh max-w-none rounded-none border-0 [&_[data-slot=sheet-close]]:z-[60]"
          overlayClassName="!bg-transparent"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sign In</SheetTitle>
          </SheetHeader>
          {/* Full-screen flickering grid background */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <FlickeringGrid
              squareSize={4}
              gridGap={6}
              flickerChance={0.3}
              color="#283DFF"
              maxOpacity={0.6}
              className="w-full h-full opacity-80"
            />
          </div>

          {/* Content overlay */}
          <div className="absolute inset-x-0 top-4 bottom-0 z-10 flex min-h-full flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
              <LoginForm onSuccess={() => setIsLoginOpen(false)} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isLogoutConfirmOpen} onOpenChange={setIsLogoutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You will need to log in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile dock moved to global layout */}
    </Sidebar>
  )
}

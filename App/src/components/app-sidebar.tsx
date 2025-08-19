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
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LoginForm } from "@/components/login-form"
import { supabase } from '@/lib/supabaseClient'

import { Calculator, MapPin, ClipboardList, Dumbbell, AppWindow, ChevronDown } from "lucide-react"
import { useTheme } from "next-themes"

type UserInfo = { id: string; email: string | null; name: string | null; avatarUrl: string | null }

export function AppSidebar() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<string>('Free')
  const { theme, resolvedTheme } = useTheme()
  const { state } = useSidebar()
  const pathname = usePathname()

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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
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
          <div className="flex items-center justify-between mb-1">
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
            <SidebarTrigger className="h-8 w-8 p-0" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center">
            Calculations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/fitness-calculator'}>
                  <a href="/fitness-calculator" className={`flex items-center gap-2 ${pathname === '/fitness-calculator' ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''}`}>
                    <Calculator />
                    <span>Weight Calculator</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center">
            Database
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/exercise-library'}>
                  <a href="/exercise-library" className={`flex items-center gap-2 ${pathname === '/exercise-library' ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''}`}>
                    <Dumbbell />
                    <span>Exercise Library</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/workout-plans'}>
                  <a href="/workout-plans" className={`flex items-center gap-2 ${pathname === '/workout-plans' ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''}`}>
                    <ClipboardList />
                    <span>Workout Plans</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/locations'}>
                  <a href="/locations" className={`flex items-center gap-2 ${pathname === '/locations' ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''}`}>
                    <MapPin />
                    <span>Locations</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center">
            App
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/fitspo-app'}>
                  <a href="/fitspo-app" className={`flex items-center gap-2 ${pathname === '/fitspo-app' ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''}`}>
                    <AppWindow />
                    <span>Fitspo App</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {state === 'collapsed' ? null : (
        <SidebarFooter className="p-4">
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
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-[260px]" align="end" side="right" sideOffset={4} alignOffset={0}>
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
                  onSelect={async (e) => { e.preventDefault(); await supabase.auth.signOut(); }}
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
        <SheetContent side="bottom" animation="fade" className="p-0 inset-0 w-screen sm:h-dvh h-svh max-w-none rounded-none border-0">
          <div className="bg-muted flex min-h-full flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
              <LoginForm onSuccess={() => setIsLoginOpen(false)} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </Sidebar>
  )
}

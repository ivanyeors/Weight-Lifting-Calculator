"use client"

import { useEffect, useMemo, useState } from 'react'
import { useSelectedUser } from '@/hooks/use-selected-user'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, PanelLeft, PanelRight, User, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'



import { PlanSidebar } from './plan-sidebar'
import Hyperspeed from '@/components/ui/shadcn-io/hyperspeed'
import { CreatePlanDrawer } from './plan-create-drawer'
import { PlanDetailsDrawer } from './plan-details-drawer'
import { usePlans } from './plan-store'
import { fetchPlans } from './plan-api'
import { syncService } from '@/lib/sync-service'
import { useOrbProgress } from './orb-progress-hooks'
import { useIsMobile } from '@/hooks/use-mobile'
 
// (kept for potential future use)

export default function FitnessGoalPage() {
  const { user } = useSelectedUser()
  const router = useRouter()

  // Plans integration
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userProfileDialogOpen, setUserProfileDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    try {
      const stored = typeof window !== 'undefined' ? (localStorage.getItem('fitspo:selected_user_id') || '') : ''
      return stored || (user?.id || '')
    } catch {
      return user?.id || ''
    }
  })
  const { plans: localPlans, update } = usePlans(selectedUserId || null)
  const [plans, setPlans] = useState(localPlans)
  useEffect(() => { setPlans(localPlans) }, [localPlans])
  useEffect(() => {
    const load = async () => {
      try {
        if (!selectedUserId) return
        const dbPlans = await fetchPlans(selectedUserId)
        if (dbPlans && dbPlans.length > 0) setPlans(dbPlans)
      } catch {/* ignore */}
    }
    void load()
  }, [selectedUserId])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const activePlan = useMemo(() => plans.find(p => p.id === selectedPlanId) || null, [plans, selectedPlanId])

  // Calculate dynamic orb values based on fitness progress
  const { hue, hoverIntensity } = useOrbProgress(activePlan)

  // Hide sidebar by default on mobile, show on larger screens
  useEffect(() => {
    setSidebarOpen(!isMobile)
  }, [isMobile])

  // Auto-select first active plan (or first plan) when none selected
  useEffect(() => {
    // fitness-goal dock actions
    const openCreate = () => setDrawerOpen(true)
    const openDetails = () => setDetailsOpen(true)
    if (typeof window !== 'undefined') {
      window.addEventListener('fitspo:open_create_plan', openCreate)
      window.addEventListener('fitspo:open_plan_details', openDetails)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('fitspo:open_create_plan', openCreate)
        window.removeEventListener('fitspo:open_plan_details', openDetails)
      }
    }
  }, [])

  useEffect(() => {
    try {
      if (plans.length === 0) return
      const active = plans.find(p => p.status === 'active')
      if (active) {
        if (selectedPlanId !== active.id) setSelectedPlanId(active.id)
        return
      }
      if (!selectedPlanId) setSelectedPlanId(plans[0].id)
    } catch {/* ignore */}
  }, [plans, selectedPlanId])

  // Create fitness reminders in calendar for active plans
  useEffect(() => {
    if (activePlan && activePlan.status === 'active' && selectedUserId) {
      syncService.createFitnessRemindersInCalendar(activePlan, selectedUserId).catch(console.error)
    }
  }, [activePlan, selectedUserId])

  // Sync active plans to database on page load
  useEffect(() => {
    if (selectedUserId) {
      syncService.syncActivePlansToDb(selectedUserId).catch(console.error)
    }
  }, [selectedUserId])

  // Set up sync listeners for real-time updates
  useEffect(() => {
    const handleLogsChanged = () => {
      // Sync fitness logs when they change
      if (selectedUserId && activePlan?.status === 'active') {
        syncService.syncFitnessLogsToDb(activePlan.id, selectedUserId).catch(console.error)
      }
    }

    const handleWorkoutCompletion = () => {
      // Sync completed workouts to fitness logs
      if (selectedUserId) {
        syncService.syncCompletedWorkoutsToFitness(selectedUserId).catch(console.error)
      }
    }

    // Listen for log changes
    syncService.on('fitness-logs-changed', handleLogsChanged)
    syncService.on('workout-completion-synced', handleWorkoutCompletion)

    // Listen for storage events (cross-tab sync)
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('fitspo:') && selectedUserId && activePlan?.status === 'active') {
        syncService.syncFitnessLogsToDb(activePlan.id, selectedUserId).catch(console.error)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage)
    }

    return () => {
      syncService.off('fitness-logs-changed', handleLogsChanged)
      syncService.off('workout-completion-synced', handleWorkoutCompletion)
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage)
      }
    }
  }, [selectedUserId, activePlan])

  useEffect(() => {
    const onChange = () => {
      try {
        const s = localStorage.getItem('fitspo:selected_user_id') || ''
        setSelectedUserId(s)
        setSelectedPlanId(null)
      } catch {
        // noop
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('fitspo:selected_user_changed', onChange)
      return () => window.removeEventListener('fitspo:selected_user_changed', onChange)
    }
  }, [])

  // Minimal state kept for metrics (currently unused; kept for future metrics)
  const [, setCurrentWeight] = useState<number>(0)
  const [targetWeight, setTargetWeight] = useState<number>(0)

  // Prefill current/target weight from the selected user's profile
  useEffect(() => {
    if (user?.inputs?.bodyWeight != null) {
      const w = Number(user.inputs.bodyWeight)
      setCurrentWeight(w)
      if (!targetWeight) setTargetWeight(w)
    }
  }, [user, targetWeight])

  // Mark fitness goal page as visited when component mounts
  useEffect(() => {
    localStorage.setItem('fitspo:fitness_goal_visited', 'true')
    // Emit event to notify onboarding
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fitspo:fitness_goal_visited'))
      }
    } catch {
      // Ignore event emission errors
    }
  }, [])

  // Removed unused calculator helpers and render-only helpers for this layout

  // Header: Create Plan click. On mobile with existing user, open sidebar instead of drawer
  const handleCreatePlanFromHeader = () => {
    if (!user) {
      setUserProfileDialogOpen(true)
      return
    }
    if (isMobile) {
      setSidebarOpen(true)
      return
    }
    setDrawerOpen(true)
  }

  // Sidebar: Create Plan should always open drawer when user exists
  const handleCreatePlanFromSidebar = () => {
    if (!user) {
      setUserProfileDialogOpen(true)
      return
    }
    setDrawerOpen(true)
  }

  // Handle navigation to users page
  const handleGoToUsersPage = () => {
    setUserProfileDialogOpen(false)
    router.push('/plans/users')
  }

  return (
    <div className="flex h-full overflow-x-hidden">
      {sidebarOpen ? (
        <PlanSidebar
          selectedUserId={selectedUserId}
          onSelectUser={(id) => { setSelectedUserId(id); setSelectedPlanId(null) }}
          onCreatePlan={handleCreatePlanFromSidebar}
          plans={plans}
          selectedPlanId={selectedPlanId}
          onSelectPlan={(id) => { setSelectedPlanId(id); setDetailsOpen(true) }}
        />
      ) : null}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setSidebarOpen((s) => !s)}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelRight className="h-4 w-4" />
              )}
            </Button>
            <div className="text-sm text-muted-foreground">{activePlan ? activePlan.title : 'Fitness Goals'}</div>
          </div>
          {activePlan ? null : (
            <Button onClick={handleCreatePlanFromHeader} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="relative flex-1 flex items-center justify-center md:block min-h-[70vh] md:min-h-0 overflow-hidden">
            {(() => {
              // Map orb hue/hoverIntensity → hyperspeed colors/speed
              const h = Math.max(0, Math.min(360, hue || 0)) / 360
              const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
              const intensity = clamp01(hoverIntensity || 0.1)

              function hslToRgb(hh: number, s: number, l: number) {
                const c = (1 - Math.abs(2 * l - 1)) * s
                const x = c * (1 - Math.abs(((hh * 6) % 2) - 1))
                const m = l - c / 2
                let r = 0, g = 0, b = 0
                if (0 <= hh && hh < 1 / 6) [r, g, b] = [c, x, 0]
                else if (1 / 6 <= hh && hh < 2 / 6) [r, g, b] = [x, c, 0]
                else if (2 / 6 <= hh && hh < 3 / 6) [r, g, b] = [0, c, x]
                else if (3 / 6 <= hh && hh < 4 / 6) [r, g, b] = [0, x, c]
                else if (4 / 6 <= hh && hh < 5 / 6) [r, g, b] = [x, 0, c]
                else [r, g, b] = [c, 0, x]
                const R = Math.round((r + m) * 255)
                const G = Math.round((g + m) * 255)
                const B = Math.round((b + m) * 255)
                return (R << 16) | (G << 8) | B
              }

              const baseLightness = 0.52
              const spread = 0.10
              const s = 0.9
              const left1 = hslToRgb(h, s, baseLightness)
              const left2 = hslToRgb(h, s, baseLightness + spread * 0.6)
              const left3 = hslToRgb(h, s, baseLightness + spread)

              const rightHue = (h + 0.55) % 1 // complementary/cyan shift
              const right1 = hslToRgb(rightHue, 0.85, baseLightness)
              const right2 = hslToRgb(rightHue, 0.85, baseLightness + spread * 0.6)
              const right3 = hslToRgb(rightHue, 0.85, baseLightness + spread)

              const sticks = hslToRgb((h + 0.08) % 1, 0.95, 0.6)

              const speedUp = 1 + intensity * 1.8 // 1.0 – 2.8
              const fovSpeedUp = 120 + Math.round(intensity * 60) // 120 – 180

              const effectOptions = {
                distortion: 'turbulentDistortion',
                speedUp,
                fovSpeedUp,
                colors: {
                  roadColor: 0x080808,
                  islandColor: 0x0a0a0a,
                  background: 0x000000,
                  shoulderLines: 0x131318,
                  brokenLines: 0x131318,
                  leftCars: [left1, left2, left3] as number[],
                  rightCars: [right1, right2, right3] as number[],
                  sticks,
                },
              }

              return (
                <div className="absolute inset-0">
                  <Hyperspeed className="w-full h-full" effectOptions={effectOptions} />
                </div>
              )
            })()}
          </div>

          <div className="p-3 md:p-4">
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs md:text-sm">Food</CardTitle>
                  <CardDescription className="text-[11px] md:text-sm">Progress / target (kcal)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-semibold">
                    {(() => {
                      try {
                        const day = new Date().toISOString().slice(0,10)
                        const tracked = activePlan?.pillars.food
                        // Progress
                        const rawP = typeof window !== 'undefined' ? localStorage.getItem('fitspo:food_kcals_by_day') : null
                        const progMap = rawP ? JSON.parse(rawP) as Record<string, number> : {}
                        const prog = Math.max(0, Math.round((progMap[day] || 0)))
                        // Target from macros if available
                        const m = activePlan?.config.food?.macros
                        const target = m ? (m.protein_g ?? 0) * 4 + (m.carbs_g ?? 0) * 4 + (m.fat_g ?? 0) * 9 : 2500
                        const tgt = Math.max(0, Math.round(target))
                        if (!tracked) return `${tgt} kcal target`
                        return `${prog} / ${tgt} kcal`
                      } catch { return '—' }
                    })()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs md:text-sm">Water</CardTitle>
                  <CardDescription className="text-[11px] md:text-sm">Progress / target (L)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-semibold">
                    {(() => {
                      try {
                        const day = new Date().toISOString().slice(0,10)
                        const tracked = activePlan?.pillars.water
                        const rawP = typeof window !== 'undefined' ? localStorage.getItem('fitspo:water_liters_by_day') : null
                        const progMap = rawP ? JSON.parse(rawP) as Record<string, number> : {}
                        const prog = Math.max(0, Math.round(((progMap[day] || 0) * 10)) / 10)
                        const target = activePlan?.config.water?.recommendedLitersPerDay ?? 3.0
                        const tgt = Math.max(0, Math.round(target * 10) / 10)
                        if (!tracked) return `${tgt} L target`
                        return `${prog} / ${tgt} L`
                      } catch { return '—' }
                    })()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs md:text-sm">Sleep</CardTitle>
                  <CardDescription className="text-[11px] md:text-sm">Progress / target (h)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-semibold">
                    {(() => {
                      try {
                        const s = activePlan?.config.sleep?.startTime || '23:00'
                        const e = activePlan?.config.sleep?.endTime || '07:00'
                        const [sh, sm] = s.split(':').map(Number)
                        const [eh, em] = e.split(':').map(Number)
                        let hrs = (eh + (eh < sh ? 24 : 0)) - sh + (em - sm)/60
                        if (!Number.isFinite(hrs)) hrs = 8
                        const tgt = Math.round(hrs*10)/10
                        const tracked = activePlan?.pillars.sleep
                        if (!tracked) return `${tgt}h target`
                        return `— / ${tgt}h`
                      } catch { return '—' }
                    })()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs md:text-sm">Exercise</CardTitle>
                  <CardDescription className="text-[11px] md:text-sm">Progress / target (kcal)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-semibold">
                    {(() => {
                      try {
                        const day = new Date().toISOString().slice(0,10)
                        const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:exercise_kcals_by_day') : null
                        const map = raw ? JSON.parse(raw) as Record<string, number> : {}
                        const prog = Math.max(0, Math.round((map[day] || 0)))
                        const tracked = activePlan?.pillars.exercise
                        const target = Math.max(0, Math.round(activePlan?.config.exercise?.estimatedKcalsPerWorkout ?? 300))
                        if (!tracked) return `${target} kcal target`
                        return `${prog} / ${target} kcal`
                      } catch { return '—' }
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <PlanDetailsDrawer
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            plan={activePlan}
            onUpdateStatus={(status) => {
              if (!activePlan) return
              if (status === 'active') {
                // Enforce single active plan
                try {
                  const userId = activePlan.userId
                  const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:plans') : null
                  const all: Record<string, Array<{ id: string; status: string }>> = raw ? JSON.parse(raw) : {}
                  const list = all[userId] || []
                  const next = list.map((p) => ({ ...p, status: p.id === activePlan.id ? 'active' : (p.status === 'completed' ? 'completed' : 'paused') }))
                  all[userId] = next
                  if (typeof window !== 'undefined') localStorage.setItem('fitspo:plans', JSON.stringify(all))
                  update(activePlan.id, { status: 'active' })
                } catch {/* ignore */}
              } else {
                update(activePlan.id, { status })
              }
            }}
          />
        </div>

        <CreatePlanDrawer open={drawerOpen} onOpenChange={setDrawerOpen} userId={selectedUserId} />

        {/* User Profile Required Dialog */}
        <Dialog open={userProfileDialogOpen} onOpenChange={setUserProfileDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center">User Profile Required</DialogTitle>
              <DialogDescription className="text-center">
                To create a personalized fitness plan, you need to set up a user profile first.
                This helps us tailor goals and recommendations to your specific needs.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Button onClick={handleGoToUsersPage} className="w-full">
                <User className="mr-2 h-4 w-4" />
                Create User Profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setUserProfileDialogOpen(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
            <div className="mt-4 text-xs text-muted-foreground text-center">
              You'll be able to set up your body measurements, fitness goals, and preferences
              to get the most accurate fitness plan recommendations.
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

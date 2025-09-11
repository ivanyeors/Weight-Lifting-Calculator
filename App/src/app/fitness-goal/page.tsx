"use client"

import { useEffect, useMemo, useState } from 'react'
import { useSelectedUser } from '@/hooks/use-selected-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ChartContainer } from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { Line as RLine, LineChart as RLineChart, YAxis as RYAxis } from 'recharts'
import type { Plan } from './plan-types'
 
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
  const { hoverIntensity } = useOrbProgress(activePlan)

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

  // Track logs changes to recompute progress chart
  const [logsVersion, setLogsVersion] = useState(0)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return
      if (
        e.key === 'fitspo:food_kcals_by_day' ||
        e.key === 'fitspo:water_liters_by_day' ||
        e.key === 'fitspo:sleep_hours_by_day' ||
        e.key === 'fitspo:exercise_kcals_by_day' ||
        e.key.startsWith('fitspo:plan_logs:')
      ) {
        setLogsVersion(v => v + 1)
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage)
      window.addEventListener('fitspo:logs_changed', () => setLogsVersion(v => v + 1))
      return () => window.removeEventListener('storage', onStorage)
    }
  }, [])

  // Helpers to compute daily overall progress (ratio of goals hit per day)
  const getDayKeysFromStart = (startISO: string, durationDays: number): string[] => {
    const out: string[] = []
    const start = new Date(startISO)
    for (let i = 0; i < durationDays; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      out.push(d.toISOString().slice(0, 10))
    }
    return out
  }

  const readNumberMap = (key: string): Record<string, number> => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
      return raw ? (JSON.parse(raw) as Record<string, number>) : {}
    } catch {
      return {}
    }
  }

  const computeTargets = (plan: Plan | null) => {
    const m = plan?.config?.food?.macros
    const foodTarget = m ? (m.protein_g ?? 0) * 4 + (m.carbs_g ?? 0) * 4 + (m.fat_g ?? 0) * 9 : 2500
    const waterTarget = plan?.config?.water?.recommendedLitersPerDay ?? 3.0
    const exerciseTarget = plan?.config?.exercise?.estimatedKcalsPerWorkout ?? 300
    let sleepTarget = 8
    try {
      const s = plan?.config?.sleep?.startTime || '23:00'
      const e = plan?.config?.sleep?.endTime || '07:00'
      const [sh, sm] = s.split(':').map(Number)
      const [eh, em] = e.split(':').map(Number)
      const hrs = (eh + (eh < sh ? 24 : 0)) - sh + (em - sm) / 60
      if (Number.isFinite(hrs)) sleepTarget = hrs
    } catch { /* ignore sleep target parse */ }
    return { foodTarget, waterTarget, sleepTarget, exerciseTarget }
  }

  const progressChartConfig: ChartConfig = useMemo(() => ({
    progress: { label: 'Progress', color: 'var(--chart-1)' },
  }), [])

  const progressData = useMemo(() => {
    void logsVersion
    if (!activePlan) return [] as Array<{ date: string; progress: number }>
    const durationDays = Math.max(1, Number(activePlan?.durationDays ?? 28))
    // Determine start date from plan.createdAt, else backfill from today
    let startDateISO: string
    try {
      const created = activePlan?.createdAt ? new Date(activePlan.createdAt) : null
      if (created && !Number.isNaN(created.getTime())) {
        startDateISO = created.toISOString().slice(0, 10)
      } else {
        const now = new Date()
        now.setDate(now.getDate() - (durationDays - 1))
        startDateISO = now.toISOString().slice(0, 10)
      }
    } catch {
      const now = new Date()
      now.setDate(now.getDate() - (durationDays - 1))
      startDateISO = now.toISOString().slice(0, 10)
    }
    const days = getDayKeysFromStart(startDateISO, durationDays)

    const targets = computeTargets(activePlan)
    const foodMap = readNumberMap('fitspo:food_kcals_by_day')
    const waterMap = readNumberMap('fitspo:water_liters_by_day')
    const sleepMap = readNumberMap('fitspo:sleep_hours_by_day')
    const exerciseMap = readNumberMap('fitspo:exercise_kcals_by_day')
    // Per-plan overrides
    let planLogs: Record<string, Partial<{ food: number; water: number; sleep: number; exercise: number }>> = {}
    try {
      const key = `fitspo:plan_logs:${activePlan.id}`
      const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
      planLogs = raw ? JSON.parse(raw) : {}
    } catch { /* ignore per-plan log parse */ }

    const todayISO = new Date().toISOString().slice(0,10)
    const out = days.map((d) => {
      let total = 0
      let hit = 0
      if (activePlan.pillars.food) {
        total++
        const v = planLogs[d]?.food ?? foodMap[d] ?? 0
        if (targets.foodTarget > 0 && v >= targets.foodTarget * 0.8) hit++
      }
      if (activePlan.pillars.water) {
        total++
        const v = planLogs[d]?.water ?? waterMap[d] ?? 0
        if (targets.waterTarget > 0 && v >= targets.waterTarget * 0.8) hit++
      }
      if (activePlan.pillars.sleep) {
        total++
        const v = planLogs[d]?.sleep ?? sleepMap[d] ?? 0
        if (targets.sleepTarget > 0 && v >= targets.sleepTarget * 0.8) hit++
      }
      if (activePlan.pillars.exercise) {
        total++
        const v = planLogs[d]?.exercise ?? exerciseMap[d] ?? 0
        if (targets.exerciseTarget > 0 && v >= targets.exerciseTarget * 0.8) hit++
      }
      const pct = total > 0 ? Math.round((hit / total) * 100) : 0
      // For future days (after today), mark as null (not tracked yet)
      const isFuture = d > todayISO
      return { date: d, progress: isFuture ? (null as unknown as number) : pct }
    })
    return out
  }, [activePlan, logsVersion])

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
          <div className="relative flex-1 min-h-[70vh] overflow-hidden">
            {(() => {
              // Build Hyperspeed options from today's pillar logging status
              const today = new Date().toISOString().slice(0, 10)

              // Utility: read numeric map from localStorage
              const mapFood = readNumberMap('fitspo:food_kcals_by_day')
              const mapWater = readNumberMap('fitspo:water_liters_by_day')
              const mapSleep = readNumberMap('fitspo:sleep_hours_by_day')
              const mapEx   = readNumberMap('fitspo:exercise_kcals_by_day')

              // Whether each (enabled) pillar has been logged today (> 0)
              const foodLogged = !!(activePlan?.pillars.food && (mapFood[today] || 0) > 0)
              const waterLogged = !!(activePlan?.pillars.water && (mapWater[today] || 0) > 0)
              const sleepLogged = !!(activePlan?.pillars.sleep && (mapSleep[today] || 0) > 0)
              const exLogged = !!(activePlan?.pillars.exercise && (mapEx[today] || 0) > 0)

              const enabledCount = (activePlan?.pillars.food ? 1 : 0) + (activePlan?.pillars.water ? 1 : 0) + (activePlan?.pillars.sleep ? 1 : 0) + (activePlan?.pillars.exercise ? 1 : 0)
              const loggedCount = (foodLogged ? 1 : 0) + (waterLogged ? 1 : 0) + (sleepLogged ? 1 : 0) + (exLogged ? 1 : 0)
              const completed = enabledCount > 0 && loggedCount === enabledCount

              // Utility: convert CSS var color (oklch/hsl/rgb) -> hex int
              function cssVarToHexInt(varName: string, fallbackHex: number): number {
                try {
                  if (typeof window === 'undefined' || typeof document === 'undefined') return fallbackHex
                  const el = document.createElement('div')
                  el.style.color = `var(${varName})`
                  // Place element to ensure styles compute under theme
                  document.body.appendChild(el)
                  const rgb = getComputedStyle(el).color // e.g., rgb(255, 0, 0)
                  document.body.removeChild(el)
                  const m = rgb.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
                  if (!m) return fallbackHex
                  const r = Math.min(255, Math.max(0, Number(m[1])))
                  const g = Math.min(255, Math.max(0, Number(m[2])))
                  const b = Math.min(255, Math.max(0, Number(m[3])))
                  return (r << 16) | (g << 8) | b
                } catch {
                  return fallbackHex
                }
              }

              // Pillar palette → hex (fallbacks match requested colors)
              const foodHex = cssVarToHexInt('--chart-1', 0x22c55e) // green-500
              const waterHex = cssVarToHexInt('--chart-2', 0x3b82f6) // blue-500
              const sleepHex = cssVarToHexInt('--chart-3', 0xa855f7) // purple-500
              const exerciseHex = cssVarToHexInt('--chart-4', 0xf97316) // orange-500

              // Default gray-500 when not logged
              const dullGrey = 0x6b7280

              // Car light colors depend on which pillars were logged today
              const leftCars: number[] = [
                foodLogged ? foodHex : dullGrey,
                waterLogged ? waterHex : dullGrey,
              ]
              const rightCars: number[] = [
                exLogged ? exerciseHex : dullGrey,
                sleepLogged ? sleepHex : dullGrey,
              ]

              // Distortion / speed / fade depend on completion
              const distortion = completed ? 'LongRaceDistortion' : 'turbulentDistortion'
              const speedUp = completed ? 2 : 0.1
              const carLightsFade = completed ? 0.4 : 0.1

              // We can still reflect orb intensity in FOV responsiveness subtly
              const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
              const intensity = clamp01(hoverIntensity || 0.1)
              const fovSpeedUp = 120 + Math.round(intensity * 60) // 120–180

              const effectOptions = {
                distortion,
                speedUp,
                carLightsFade,
                fovSpeedUp,
                colors: {
                  roadColor: 0x080808,
                  islandColor: 0x0a0a0a,
                  background: 0x000000,
                  shoulderLines: 0x131318,
                  brokenLines: 0x131318,
                  leftCars,
                  rightCars,
                  sticks: dullGrey,
                },
              }

              return (
                <div className="absolute inset-0">
                  <Hyperspeed className="w-full h-full" effectOptions={effectOptions} />
                </div>
              )
            })()}
            {/* Centered 2x2 pillar grid overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[min(90vw,640px)] flex flex-col items-stretch gap-4 md:gap-6">
                <div className="w-full">
                  <ChartContainer config={progressChartConfig} className="w-full h-[120px] md:h-[140px] overflow-visible">
                    <RLineChart accessibilityLayer data={progressData} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
                      <RYAxis domain={[0, 100]} hide />
                      <RLine dataKey="progress" type="natural" stroke="#ffffff" strokeWidth={2} dot={false} isAnimationActive={false} strokeLinecap="round" />
                    </RLineChart>
                  </ChartContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 p-3 md:p-4">
                <Card className="bg-transparent border-none shadow-none">
                  <CardHeader className="p-0">
                    <CardTitle className="text-xs md:text-sm">Food</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
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
                <Card className="bg-transparent border-none shadow-none">
                  <CardHeader className="p-0">
                    <CardTitle className="text-xs md:text-sm">Water</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
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
                <Card className="bg-transparent border-none shadow-none">
                  <CardHeader className="p-0">
                    <CardTitle className="text-xs md:text-sm">Sleep</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
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
                <Card className="bg-transparent border-none shadow-none">
                  <CardHeader className="p-0">
                    <CardTitle className="text-xs md:text-sm">Exercise</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
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

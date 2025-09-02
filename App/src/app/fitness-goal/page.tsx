"use client"

import { useEffect, useMemo, useState } from 'react'
import { useSelectedUser } from '@/hooks/use-selected-user'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, PanelLeft, PanelRight } from 'lucide-react'



import { PlanSidebar } from './plan-sidebar'
import { ParticlesCard } from './particles/ParticlesCard'
import { CreatePlanDrawer } from './plan-create-drawer'
import { PlanDetailsDrawer } from './plan-details-drawer'
import { usePlans } from './plan-store'
import { fetchPlans } from './plan-api'
 
// (kept for potential future use)

export default function FitnessGoalPage() {
  const { user } = useSelectedUser()

  // Plans integration
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
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
  // Auto-select first active plan (or first plan) when none selected
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
  const [detailsOpen, setDetailsOpen] = useState(false)
  const activePlan = useMemo(() => plans.find(p => p.id === selectedPlanId) || null, [plans, selectedPlanId])

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

  // Removed unused calculator helpers and render-only helpers for this layout



  return (
    <div className="flex h-full">
      {sidebarOpen ? (
        <PlanSidebar
          selectedUserId={selectedUserId}
          onSelectUser={(id) => { setSelectedUserId(id); setSelectedPlanId(null) }}
          onCreatePlan={() => setDrawerOpen(true)}
          plans={plans}
          selectedPlanId={selectedPlanId}
          onSelectPlan={(id) => { setSelectedPlanId(id); setDetailsOpen(true) }}
        />
      ) : null}

      <div className="flex-1 flex flex-col">
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
            <Button onClick={() => setDrawerOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          )}
        </div>

        <div className="flex-1 flex flex-col">
          <div className="relative flex-1">
            <ParticlesCard plan={activePlan} />
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Food</CardTitle>
                  <CardDescription>Progress / target (kcal)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
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
                  <CardTitle className="text-sm">Water</CardTitle>
                  <CardDescription>Progress / target (L)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
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
                  <CardTitle className="text-sm">Sleep</CardTitle>
                  <CardDescription>Progress / target (h)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
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
                  <CardTitle className="text-sm">Exercise</CardTitle>
                  <CardDescription>Progress / target (kcal)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
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
      </div>
    </div>
  )
}

"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import type { Plan } from './plan-types'
import { StackedPillarChart } from './StackedPillarChart'
import { savePlan } from './plan-api'
import { usePlans } from './plan-store'
import { useMemo, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

export function PlanDetailsDrawer({
  open,
  onOpenChange,
  plan,
  onUpdateStatus,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  plan: Plan | null
  onUpdateStatus: (status: Plan['status']) => void
}) {
  if (!plan) return null

  const { update } = usePlans(plan.userId)

  const targets = useMemo(() => {
    const m = plan?.config.food?.macros
    const foodTgt = m ? (m.protein_g ?? 0) * 4 + (m.carbs_g ?? 0) * 4 + (m.fat_g ?? 0) * 9 : 2500
    const waterTgt = plan?.config.water?.recommendedLitersPerDay ?? 3.0
    let sleepTgt = 8
    try {
      const s = plan?.config.sleep?.startTime || '23:00'
      const e = plan?.config.sleep?.endTime || '07:00'
      const [sh, sm] = s.split(':').map(Number)
      const [eh, em] = e.split(':').map(Number)
      let hrs = (eh + (eh < sh ? 24 : 0)) - sh + (em - sm) / 60
      if (Number.isFinite(hrs)) sleepTgt = hrs
    } catch {}
    return { foodTgt, waterTgt, sleepTgt }
  }, [plan])

  const [todayFood, setTodayFood] = useState<string>('')
  const [todayWater, setTodayWater] = useState<string>('')
  const [todaySleep, setTodaySleep] = useState<string>('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; estimatedCalories: number }>>([])

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('workout_templates')
          .select('id, name, estimated_calories')
          .order('updated_at', { ascending: false })
        if (error) throw error
        const mapped = (data ?? []).map((r: any) => ({ id: r.id as string, name: (r.name as string) ?? r.id, estimatedCalories: Number(r.estimated_calories ?? 0) }))
        setTemplates(mapped)
      } catch {
        setTemplates([])
      }
    }
    if (open && plan) void loadTemplates()
  }, [open, plan])

  const persistDayValue = (mapKey: string, day: string, value: number) => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(mapKey) : null
      const map = raw ? (JSON.parse(raw) as Record<string, number>) : {}
      map[day] = value
      localStorage.setItem(mapKey, JSON.stringify(map))
    } catch {}
  }

  const persistPlanLog = (planId: string, day: string, partial: Partial<{ food: number; water: number; sleep: number; exercise: number }>) => {
    try {
      const key = `fitspo:plan_logs:${planId}`
      const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
      const map = raw ? (JSON.parse(raw) as Record<string, any>) : {}
      const cur = map[day] || { date: day }
      map[day] = { ...cur, ...partial }
      localStorage.setItem(key, JSON.stringify(map))
    } catch {}
    try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('fitspo:logs_changed')) } catch {}
  }

  const setSingleActive = async () => {
    try {
      const userId = plan.userId
      const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:plans') : null
      const all: Record<string, Plan[]> = raw ? JSON.parse(raw) : {}
      const list = all[userId] || []
      const next = list.map((p) => ({ ...p, status: p.id === plan.id ? 'active' : (p.status === 'completed' ? 'completed' : 'paused') }))
      all[userId] = next
      if (typeof window !== 'undefined') localStorage.setItem('fitspo:plans', JSON.stringify(all))
      update(plan.id, { status: 'active' })
      try { await savePlan({ ...plan, status: 'active' }) } catch {}
      for (const p of next) {
        if (p.id !== plan.id && p.status !== 'completed') {
          try { await savePlan({ ...p, status: 'paused' }) } catch {}
        }
      }
      try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('fitspo:plans_changed')) } catch {}
    } catch {}
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        animation="slide"
        overlayClassName="bg-transparent pointer-events-none"
        trapFocus={false}
        className="w-[60vw] sm:w-[60vw] lg:w-[60vw] max-w-none sm:max-w-none"
      >
        <SheetHeader className="p-4">
          <SheetTitle>{plan.title}</SheetTitle>
          <SheetDescription>
            Status: <span className="uppercase text-xs tracking-wide">{plan.status}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-4 space-y-4 overflow-auto">
          <div className="border rounded p-3">
            <div className="text-sm font-medium mb-2">Progress over goal</div>
            <StackedPillarChart plan={plan} />
          </div>

          <div className="border rounded p-3">
            <div className="text-sm font-medium mb-3">Quick log today</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {plan.pillars.food && (
                <div className="space-y-1">
                  <Label className="text-xs">Food (kcal)</Label>
                  <Input placeholder={`${Math.round(targets.foodTgt)}`} inputMode="numeric" value={todayFood} onChange={(e) => setTodayFood(e.target.value)} />
                  <Button size="sm" onClick={() => {
                    const day = new Date().toISOString().slice(0,10)
                    const val = todayFood === '' ? Math.round(targets.foodTgt) : Number(todayFood)
                    persistDayValue('fitspo:food_kcals_by_day', day, Math.max(0, val))
                    persistPlanLog(plan.id, day, { food: Math.max(0, val) })
                    try { toast.success(`Food saved: ${Math.max(0, val)} kcal`) } catch {}
                    setTodayFood('')
                  }}>Save</Button>
                </div>
              )}
              {plan.pillars.water && (
                <div className="space-y-1">
                  <Label className="text-xs">Water (L)</Label>
                  <Input placeholder={`${targets.waterTgt}`} inputMode="decimal" value={todayWater} onChange={(e) => setTodayWater(e.target.value)} />
                  <Button size="sm" onClick={() => {
                    const day = new Date().toISOString().slice(0,10)
                    const val = todayWater === '' ? targets.waterTgt : Number(todayWater)
                    const v = Math.max(0, Number.isFinite(val) ? val : 0)
                    persistDayValue('fitspo:water_liters_by_day', day, v)
                    persistPlanLog(plan.id, day, { water: v })
                    try { toast.success(`Water saved: ${v} L`) } catch {}
                    setTodayWater('')
                  }}>Save</Button>
                </div>
              )}
              {plan.pillars.sleep && (
                <div className="space-y-1">
                  <Label className="text-xs">Sleep (h)</Label>
                  <Input placeholder={`${Math.round(targets.sleepTgt*10)/10}`} inputMode="decimal" value={todaySleep} onChange={(e) => setTodaySleep(e.target.value)} />
                  <Button size="sm" onClick={() => {
                    const day = new Date().toISOString().slice(0,10)
                    const val = todaySleep === '' ? targets.sleepTgt : Number(todaySleep)
                    const v = Math.max(0, Number.isFinite(val) ? val : 0)
                    persistDayValue('fitspo:sleep_hours_by_day', day, v)
                    persistPlanLog(plan.id, day, { sleep: v })
                    try { toast.success(`Sleep saved: ${v} h`) } catch {}
                    setTodaySleep('')
                  }}>Save</Button>
                </div>
              )}
              {plan.pillars.exercise && (
                <div className="space-y-1">
                  <Label className="text-xs">Exercise (workout template)</Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-[11px] text-muted-foreground">
                    {(() => {
                      const t = templates.find(tt => tt.id === selectedTemplateId)
                      return t ? `Estimated: ${t.estimatedCalories} kcal` : '—'
                    })()}
                  </div>
                  <Button size="sm" onClick={() => {
                    const day = new Date().toISOString().slice(0,10)
                    const t = templates.find(tt => tt.id === selectedTemplateId)
                    const kcals = Math.max(0, Number(t?.estimatedCalories ?? 0))
                    persistDayValue('fitspo:exercise_kcals_by_day', day, kcals)
                    persistPlanLog(plan.id, day, { exercise: kcals })
                    try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('fitspo:logs_changed')) } catch {}
                    try { toast.success(`Exercise saved: ${kcals} kcal (${t?.name || 'Template'})`) } catch {}
                    setSelectedTemplateId('')
                  }} disabled={!selectedTemplateId}>Save</Button>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Duration</div>
              <div>{plan.durationDays ? `${plan.durationDays} days` : '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Pillars</div>
              <div className="flex gap-2">
                {(['food','water','sleep','exercise'] as const).map(p => (
                  <span key={p} className={`text-xs px-2 py-0.5 rounded border ${plan.pillars[p] ? 'border-foreground/30' : 'border-muted text-muted-foreground'}`}>{p}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-medium">Food</div>
            <div className="text-sm text-muted-foreground">
              Target Weight: {plan.config.food?.targetWeightKg != null ? `${plan.config.food.targetWeightKg} kg` : '—'}
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-medium">Water</div>
            <div className="text-sm text-muted-foreground">
              Recommended: {plan.config.water?.recommendedLitersPerDay != null ? `${plan.config.water?.recommendedLitersPerDay} L/day` : '—'}
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-medium">Sleep</div>
            <div className="text-sm text-muted-foreground">
              Window: {plan.config.sleep?.startTime || '—'} – {plan.config.sleep?.endTime || '—'}
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-medium">Exercise</div>
            <div className="text-sm text-muted-foreground">
              Physique: {plan.config.exercise?.physique || '—'}
            </div>
          </div>
        </div>

        <div className="mt-auto p-4 flex gap-2">
          <Button
            variant="default"
            disabled={plan.status === 'active'}
            onClick={async () => { await setSingleActive(); onUpdateStatus('active') }}
          >
            Start plan
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              if (plan.status === 'paused') {
                await setSingleActive();
                onUpdateStatus('active')
              } else {
                onUpdateStatus('paused')
              }
            }}
          >
            {plan.status === 'paused' ? 'Resume plan' : 'Pause plan'}
          </Button>
          <Button variant="outline" onClick={() => onUpdateStatus('completed')}>Stop plan</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default PlanDetailsDrawer



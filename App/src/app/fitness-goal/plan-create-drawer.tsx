"use client"

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Plan } from './plan-types'
import { usePlans } from './plan-store'
import { savePlan } from './plan-api'
import { useSelectedUser } from '@/hooks/use-selected-user'
import { syncService } from '@/lib/sync-service'

export type PillarKey = 'food' | 'water' | 'sleep' | 'exercise'

export function CreatePlanDrawer({ open, onOpenChange, userId, plan, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; userId: string; plan?: Plan | null; onSaved?: (p: Plan) => void }) {
  const { add, update } = usePlans(userId || null)
  const { user } = useSelectedUser()
  const [title, setTitle] = useState('New Plan')
  const [pillars, setPillars] = useState<Record<PillarKey, boolean>>({ food: true, water: true, sleep: true, exercise: true })

  const [foodTargetWeight, setFoodTargetWeight] = useState<number | ''>('')
  const [exercisePhysique, setExercisePhysique] = useState<string>('')
  const [recommendedWaterLpd, setRecommendedWaterLpd] = useState<number | null>(null)
  const [durationDays, setDurationDays] = useState<number | ''>('')
  const isEdit = Boolean(plan)

  useEffect(() => {
    if (!open) return
    // compute water recommendation when drawer opens or user changes
    try {
      if (user?.inputs) {
        const { bodyWeight, height, age, gender } = user.inputs
        const litersByWeight = 0.035 * Number(bodyWeight || 0)
        const heightAdj = Number(height || 0) > 180 ? 0.2 : 0
        const ageAdj = Number(age || 0) < 30 ? 0.1 : (Number(age || 0) > 55 ? -0.1 : 0)
        const genderMin = gender === 'male' ? 2.6 : 2.2
        const liters = Math.max(genderMin, litersByWeight + heightAdj + ageAdj)
        const rounded = Math.round(liters * 10) / 10
        setRecommendedWaterLpd(Number.isFinite(rounded) ? rounded : null)
      } else {
        setRecommendedWaterLpd(null)
      }
    } catch {
      setRecommendedWaterLpd(null)
    }
  }, [open, user])

  // Prefill when editing
  useEffect(() => {
    if (!open) return
    if (plan) {
      setTitle(plan.title || 'Edit Plan')
      setPillars({ ...plan.pillars })
      setDurationDays(plan.durationDays ?? '')
      setFoodTargetWeight(plan.config.food?.targetWeightKg ?? '')
      setExercisePhysique(plan.config.exercise?.physique || '')
      if (plan.config.water?.recommendedLitersPerDay != null) setRecommendedWaterLpd(plan.config.water?.recommendedLitersPerDay ?? null)
    } else {
      setTitle('New Plan')
      setPillars({ food: true, water: true, sleep: true, exercise: true })
      setDurationDays('')
      setFoodTargetWeight('')
      setExercisePhysique('')
    }
  }, [open, plan])

  const calculateBMR = (weightKg: number, heightCm: number, ageYears: number, gender: string) => {
    return gender === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161
  }

  const calculateTDEE = (bmr: number, multiplier = 1.55) => bmr * multiplier

  const computePlanNutrition = () => {
    try {
      const w = Number(user?.inputs?.bodyWeight ?? 70)
      const h = Number(user?.inputs?.height ?? 175)
      const a = Number(user?.inputs?.age ?? 30)
      const g = user?.inputs?.gender ?? 'male'
      const bmr = calculateBMR(w, h, a, g)
      const tdee = calculateTDEE(bmr)
      const tgt = foodTargetWeight === '' ? w : Number(foodTargetWeight)
      let dailyCalories = tdee
      const dDays = durationDays === '' ? 0 : Number(durationDays)
      const deltaKg = tgt - w
      if (dDays > 0 && deltaKg !== 0) {
        const totalChange = Math.abs(deltaKg) * 7700
        const perDay = totalChange / dDays
        dailyCalories = deltaKg > 0 ? tdee + perDay : tdee - perDay
      }
      // Macro ratios fallback
      const protein = Math.round((dailyCalories * 0.3) / 4)
      const carbs = Math.round((dailyCalories * 0.45) / 4)
      const fat = Math.round((dailyCalories * 0.25) / 9)
      return { dailyCalories, macros: { protein_g: protein, carbs_g: carbs, fat_g: fat } }
    } catch {
      return { dailyCalories: undefined as number | undefined, macros: undefined as any }
    }
  }

  const computeExerciseKcals = () => {
    try {
      const weightKg = Number(user?.inputs?.bodyWeight ?? 70)
      const MET = 6 // strength training moderate
      const minutes = 45
      const kcals = Math.round((MET * 3.5 * weightKg) / 200 * minutes)
      return kcals
    } catch { return undefined }
  }

  const toggle = (k: PillarKey) => setPillars(s => ({ ...s, [k]: !s[k] }))

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="right" className="w-full max-w-[100vw] sm:w-[560px] md:w-[640px] p-3 sm:p-4">
        <SheetHeader>
          <SheetTitle>Create Plan</SheetTitle>
          <SheetDescription>Select goals across pillars, then save</SheetDescription>
        </SheetHeader>
        <div className="py-3 sm:py-4 space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., 12-week cut" />
          </div>

          <div className="space-y-2 sm:space-y-3">
            <div className="text-sm font-medium">Tracking plan</div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {(['food','water','sleep','exercise'] as PillarKey[]).map(k => (
                <Checkbox key={k} variant="chip" checked={pillars[k]} onCheckedChange={() => toggle(k)}>
                  <span className="capitalize">{k}</span>
                </Checkbox>
              ))}
            </div>
          </div>

          {pillars.food && (
            <div className="space-y-2 border rounded p-2 sm:p-3">
              <div className="font-medium">Food</div>
              <Label htmlFor="targetWeight">Target Weight (kg)</Label>
              <Input id="targetWeight" type="number" value={foodTargetWeight} onChange={(e) => setFoodTargetWeight(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g., 72" />
              <div className="text-xs text-muted-foreground">Macros will be computed based on target</div>
            </div>
          )}

          {pillars.water && (
            <div className="space-y-2 border rounded p-2 sm:p-3">
              <div className="font-medium">Water</div>
              <div className="space-y-2">
                <Label>Recommended intake</Label>
                <div className="text-sm">
                  {recommendedWaterLpd != null ? `${recommendedWaterLpd} L/day` : '—'}
                </div>
                <div className="text-xs text-muted-foreground">Based on your profile (gender, age, height, weight)</div>
              </div>
              <div className="space-y-2 pt-2">
                <Label>Daily water reminders (times)</Label>
                <div className="text-xs text-muted-foreground">We will schedule reminders and sync as tasks to Google</div>
              </div>
            </div>
          )}

          {pillars.sleep && (
            <div className="space-y-2 border rounded p-2 sm:p-3">
              <div className="font-medium">Sleep</div>
              <Label>Preferred sleep window</Label>
              <div className="text-xs text-muted-foreground">Blocks will appear locally in calendar view</div>
            </div>
          )}

          {pillars.exercise && (
            <div className="space-y-2 border rounded p-2 sm:p-3">
              <div className="font-medium">Exercise</div>
              <Label htmlFor="physique">Target Body Physique</Label>
              <Select value={exercisePhysique} onValueChange={setExercisePhysique}>
                <SelectTrigger id="physique">
                  <SelectValue placeholder="Select body physique" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lean">Lean</SelectItem>
                  <SelectItem value="lean_muscular">Lean Muscular</SelectItem>
                  <SelectItem value="muscular">Muscular</SelectItem>
                  <SelectItem value="extreme_muscular">Extreme Muscular</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">Template, weights, and reps will be derived from selection</div>
              <div className="pt-3 space-y-2">
                <Label htmlFor="durationDays">Goal duration (days)</Label>
                <Input id="durationDays" type="number" inputMode="numeric" value={durationDays} onChange={(e) => setDurationDays(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g., 56" />
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!userId) return onOpenChange(false)
              const nutrition = computePlanNutrition()
              const exKcals = computeExerciseKcals()
              const base: Plan = plan ? { ...plan } as Plan : {
                id: String(Date.now()),
                userId,
                title: title || 'New Plan',
                status: 'draft',
                pillars: { ...pillars },
                config: { },
                createdAt: new Date().toISOString(),
              }
              const next: Plan = {
                ...base,
                title: title || base.title,
                pillars: { ...pillars },
                durationDays: durationDays === '' ? undefined : Number(durationDays),
                config: {
                  food: pillars.food ? { targetWeightKg: (foodTargetWeight === '' ? undefined : Number(foodTargetWeight)), macros: nutrition.macros } : base.config.food,
                  water: pillars.water ? { reminders: base.config.water?.reminders || [], recommendedLitersPerDay: recommendedWaterLpd ?? base.config.water?.recommendedLitersPerDay } : base.config.water,
                  sleep: pillars.sleep ? { startTime: base.config.sleep?.startTime, endTime: base.config.sleep?.endTime } : base.config.sleep,
                  exercise: pillars.exercise ? { physique: exercisePhysique || base.config.exercise?.physique || '', templateId: base.config.exercise?.templateId || null, estimatedKcalsPerWorkout: exKcals } : base.config.exercise,
                },
              }
              if (isEdit) {
                update(next.id, next)
              } else {
                add(next)
              }
              try { await savePlan(next) } catch {/* ignore */}
              // Sync to database if plan is active
              if (next.status === 'active' && userId) {
                try { await syncService.syncActivePlansToDb(userId) } catch {/* ignore */}
              }
              try { onSaved?.(next) } catch {}
              onOpenChange(false)
            }}>Save</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

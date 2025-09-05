"use client"

import { useMemo } from 'react'
import type { Plan } from './plan-types'

export function useOrbProgress(plan: Plan | null) {
  const { hue, hoverIntensity } = useMemo(() => {
    if (!plan) return { hue: 0, hoverIntensity: 0.1 }

    const durationDays = plan.durationDays || 28
    const today = new Date().toISOString().slice(0, 10)

    // Calculate successful days logged (for hue)
    // Hue increases from 0 to 360 based on days logged vs target duration
    const successfulDays = calculateSuccessfulDays(plan, durationDays)
    const hue = Math.min(360, (successfulDays / durationDays) * 360)

    // Calculate today's progress percentage (for hoverIntensity)
    // 0.1 for nothing logged, 1.0 for all pillars logged
    const todayProgress = calculateTodayProgress(plan, today)
    const hoverIntensity = Math.max(0.1, todayProgress)

    return { hue, hoverIntensity }
  }, [plan])

  return { hue, hoverIntensity }
}

function calculateSuccessfulDays(plan: Plan, targetDays: number): number {
  try {
    const days = getDayKeys(targetDays)

    // Get all logged data
    const foodMap = readNumberMap('fitspo:food_kcals_by_day')
    const waterMap = readNumberMap('fitspo:water_liters_by_day')
    const sleepMap = readNumberMap('fitspo:sleep_hours_by_day')
    const exerciseMap = readNumberMap('fitspo:exercise_kcals_by_day')

    // Calculate targets
    const targets = computeTargets(plan)

    let successfulDays = 0

    for (const day of days) {
      let dayScore = 0
      let totalPillars = 0

      if (plan.pillars.food) {
        totalPillars++
        const progress = foodMap[day] || 0
        if (progress >= targets.foodTarget * 0.8) dayScore++ // 80% of target counts as success
      }

      if (plan.pillars.water) {
        totalPillars++
        const progress = waterMap[day] || 0
        if (progress >= targets.waterTarget * 0.8) dayScore++
      }

      if (plan.pillars.sleep) {
        totalPillars++
        const progress = sleepMap[day] || 0
        if (progress >= targets.sleepTarget * 0.8) dayScore++
      }

      if (plan.pillars.exercise) {
        totalPillars++
        const progress = exerciseMap[day] || 0
        if (progress >= targets.exerciseTarget * 0.8) dayScore++
      }

      // Count as successful if 80% of pillars are logged
      if (totalPillars > 0 && (dayScore / totalPillars) >= 0.8) {
        successfulDays++
      }
    }

    return successfulDays
  } catch {
    return 0
  }
}

function calculateTodayProgress(plan: Plan, today: string): number {
  try {
    // Get today's logged data
    const foodMap = readNumberMap('fitspo:food_kcals_by_day')
    const waterMap = readNumberMap('fitspo:water_liters_by_day')
    const sleepMap = readNumberMap('fitspo:sleep_hours_by_day')
    const exerciseMap = readNumberMap('fitspo:exercise_kcals_by_day')

    let loggedCount = 0
    let totalPillars = 0

    if (plan.pillars.food) {
      totalPillars++
      const progress = foodMap[today] || 0
      if (progress > 0) loggedCount++
    }

    if (plan.pillars.water) {
      totalPillars++
      const progress = waterMap[today] || 0
      if (progress > 0) loggedCount++
    }

    if (plan.pillars.sleep) {
      totalPillars++
      const progress = sleepMap[today] || 0
      if (progress > 0) loggedCount++
    }

    if (plan.pillars.exercise) {
      totalPillars++
      const progress = exerciseMap[today] || 0
      if (progress > 0) loggedCount++
    }

    // Return progress as percentage (0.1 minimum, 1.0 maximum)
    return totalPillars > 0 ? Math.max(0.1, loggedCount / totalPillars) : 0.1
  } catch {
    return 0.1
  }
}

function getDayKeys(durationDays: number): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = durationDays - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

function readNumberMap(key: string): Record<string, number> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function computeTargets(plan: Plan) {
  // Food kcal/day target from macros
  const m = plan?.config?.food?.macros
  const foodTarget = m ? (m.protein_g ?? 0) * 4 + (m.carbs_g ?? 0) * 4 + (m.fat_g ?? 0) * 9 : 2500
  // Water liters/day target
  const waterTarget = plan?.config?.water?.recommendedLitersPerDay ?? 3.0
  // Exercise kcals/day target
  const exerciseTarget = plan?.config?.exercise?.estimatedKcalsPerWorkout ?? 300
  // Sleep hours/day target
  try {
    const s = plan?.config?.sleep?.startTime || '23:00'
    const e = plan?.config?.sleep?.endTime || '07:00'
    const [sh, sm] = s.split(':').map(Number)
    const [eh, em] = e.split(':').map(Number)
    let hrs = (eh + (eh < sh ? 24 : 0)) - sh + (em - sm) / 60
    if (!Number.isFinite(hrs)) hrs = 8
    return { foodTarget, waterTarget, sleepTarget: hrs, exerciseTarget }
  } catch {
    return { foodTarget, waterTarget, sleepTarget: 8, exerciseTarget }
  }
}

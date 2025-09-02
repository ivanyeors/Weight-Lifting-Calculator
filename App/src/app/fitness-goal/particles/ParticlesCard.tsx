"use client"

import { useMemo } from "react"
import { ParticlesScene } from "./app"
import type { Plan } from "../plan-types"

const FOOD = [0.245, 0.62, 0.043] as [number, number, number] // #f59e0b
const WATER = [0.231, 0.51, 0.965] as [number, number, number] // #3b82f6
const SLEEP = [0.545, 0.36, 0.965] as [number, number, number] // #8b5cf6
const EXERCISE = [0.984, 0.572, 0.235] as [number, number, number] // #fb923c

export function ParticlesCard({ plan }: { plan?: Plan | null }) {
  const weights = useMemo(() => {
    try {
      const day = new Date().toISOString().slice(0,10)
      // Food ratio from progress/target kcals
      let food = 0.0
      try {
        const rawP = typeof window !== 'undefined' ? localStorage.getItem('fitspo:food_kcals_by_day') : null
        const progMap = rawP ? JSON.parse(rawP) as Record<string, number> : {}
        const prog = Math.max(0, progMap[day] || 0)
        const m = plan?.config.food?.macros
        const tgt = Math.max(1, Math.round(m ? (m.protein_g ?? 0) * 4 + (m.carbs_g ?? 0) * 4 + (m.fat_g ?? 0) * 9 : 2500))
        food = Math.max(0, Math.min(1, prog / tgt))
      } catch {}
      // Water ratio from liters / target liters
      let water = 0.0
      try {
        const rawP = typeof window !== 'undefined' ? localStorage.getItem('fitspo:water_liters_by_day') : null
        const progMap = rawP ? JSON.parse(rawP) as Record<string, number> : {}
        const prog = Math.max(0, progMap[day] || 0)
        const tgt = Math.max(0.1, plan?.config.water?.recommendedLitersPerDay ?? 3.0)
        water = Math.max(0, Math.min(1, prog / tgt))
      } catch {}
      // Sleep ratio from hours / target window
      let sleep = 0.0
      try {
        const s = plan?.config.sleep?.startTime || '23:00'
        const e = plan?.config.sleep?.endTime || '07:00'
        const [sh, sm] = s.split(':').map(Number)
        const [eh, em] = e.split(':').map(Number)
        let tgtHrs = (eh + (eh < sh ? 24 : 0)) - sh + (em - sm)/60
        if (!Number.isFinite(tgtHrs)) tgtHrs = 8
        const rawP = typeof window !== 'undefined' ? localStorage.getItem('fitspo:sleep_hours_by_day') : null
        const progMap = rawP ? JSON.parse(rawP) as Record<string, number> : {}
        const prog = Math.max(0, progMap[day] || 0)
        sleep = Math.max(0, Math.min(1, prog / Math.max(0.5, tgtHrs)))
      } catch {}
      // Exercise ratio from kcals vs target kcals
      let exercise = 0.0
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:exercise_kcals_by_day') : null
        const map = raw ? JSON.parse(raw) as Record<string, number> : {}
        const prog = Math.max(0, map[day] || 0)
        const tgt = Math.max(1, plan?.config.exercise?.estimatedKcalsPerWorkout ?? 300)
        exercise = Math.max(0, Math.min(1, prog / tgt))
      } catch {}
      const enabled = plan?.pillars
      const wFood = enabled?.food ? food : 0
      const wWater = enabled?.water ? water : 0
      const wSleep = enabled?.sleep ? sleep : 0
      const wExercise = enabled?.exercise ? exercise : 0
      return [wFood, wWater, wSleep, wExercise] as [number, number, number, number]
    } catch {
      return [0.3, 0.3, 0.7, 0.4] as [number, number, number, number]
    }
  }, [plan])

  const colors = useMemo(() => [FOOD, WATER, SLEEP, EXERCISE] as [number[], number[], number[], number[]], [])

  return (
    <div className="relative w-full h-full overflow-hidden">
      <ParticlesScene colors={colors as any} weights={weights as any} />
    </div>
  )
}

export default ParticlesCard

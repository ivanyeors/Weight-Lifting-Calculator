"use client"

import { useMemo } from "react"
import { ParticlesScene } from "./app"
import { Card } from "@/components/ui/card"
import type { Plan } from "../plan-types"

const FOOD = [0.245, 0.62, 0.043] as [number, number, number] // #f59e0b
const WATER = [0.231, 0.51, 0.965] as [number, number, number] // #3b82f6
const SLEEP = [0.545, 0.36, 0.965] as [number, number, number] // #8b5cf6
const EXERCISE = [0.984, 0.572, 0.235] as [number, number, number] // #fb923c

export function ParticlesCard({ plan }: { plan?: Plan | null }) {
  const weights = useMemo(() => {
    try {
      const day = new Date().toISOString().slice(0,10)
      // Food
      let food = 0.3
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:food_status_by_day') : null
        const map = raw ? JSON.parse(raw) as Record<string, 'pending'|'complete'|'missed'> : {}
        const s = map[day]
        food = s === 'complete' ? 1 : s === 'missed' ? 0.1 : 0.3
      } catch {}
      // Water
      let water = 0.0
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:water_status_by_day') : null
        const store = raw ? JSON.parse(raw) as Record<string, Record<string, 'pending'|'complete'|'missed'>> : {}
        const dayMap = store[day] || {}
        const vals = Object.values(dayMap)
        const comp = vals.filter(v => v === 'complete').length
        water = vals.length === 0 ? 0.0 : Math.max(0, Math.min(1, comp / vals.length))
      } catch {}
      // Sleep
      let sleep = 0.7
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:plans') : null
        const userId = typeof window !== 'undefined' ? (localStorage.getItem('fitspo:selected_user_id') || '') : ''
        const all = raw ? JSON.parse(raw) as Record<string, Array<{ config?: { sleep?: { startTime?: string; endTime?: string } } }>> : {}
        const p = (all[userId] || [])[0]
        const s = p?.config?.sleep?.startTime || '23:00'
        const e = p?.config?.sleep?.endTime || '07:00'
        const [sh, sm] = s.split(':').map(Number)
        const [eh, em] = e.split(':').map(Number)
        let hrs = (eh + (eh < sh ? 24 : 0)) - sh + (em - sm)/60
        if (!Number.isFinite(hrs)) hrs = 8
        sleep = Math.max(0, Math.min(1, hrs / 8))
      } catch {}
      // Exercise
      let exercise = 0.0
      try {
        const today = day
        const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:cached_events') : null
        const events = raw ? JSON.parse(raw) as Array<{ source?: string; start?: string }> : []
        const count = events.filter(e => e.source === 'platform' && (e.start || '').startsWith(today)).length
        exercise = Math.max(0, Math.min(1, count / 1))
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

  const colors = useMemo(() => [FOOD, WATER, SLEEP, EXERCISE] as [any, any, any, any], [])

  return (
    <Card className="p-0 overflow-hidden h-[280px] md:h-[340px]">
      <ParticlesScene colors={colors as any} weights={weights as any} />
    </Card>
  )
}

export default ParticlesCard

"use client"

import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { Plan } from './plan-types'
import type { ChartConfig } from '@/components/ui/chart'

type DailyLog = {
  date: string
  food?: number
  water?: number
  sleep?: number
  exercise?: number
}

type ChartRow = {
  date: string
  food?: number
  water?: number
  sleep?: number
  exercise?: number
}

const COLORS = {
  food: 'var(--chart-1)',
  water: 'var(--chart-2)',
  sleep: 'var(--chart-3)',
  exercise: 'var(--chart-4)',
} as const

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

function readPlanLogs(planId?: string | null): Record<string, Partial<DailyLog>> {
  if (!planId) return {}
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(`fitspo:plan_logs:${planId}`) : null
    return raw ? (JSON.parse(raw) as Record<string, Partial<DailyLog>>) : {}
  } catch {
    return {}
  }
}

export function StackedPillarChart({ plan }: { plan: Plan }) {
  const durationDays = Math.max(1, Number(plan?.durationDays ?? 28))
  const days = useMemo(() => getDayKeys(durationDays), [durationDays])

  const targets = useMemo(() => computeTargets(plan), [plan])

  const [logsVersion, setLogsVersion] = useState(0)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return
      if (
        e.key === 'fitspo:food_kcals_by_day' ||
        e.key === 'fitspo:water_liters_by_day' ||
        e.key === 'fitspo:sleep_hours_by_day' ||
        e.key === 'fitspo:cached_events' ||
        e.key.startsWith('fitspo:plan_logs:')
      ) {
        setLogsVersion((v) => v + 1)
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage)
      window.addEventListener('fitspo:logs_changed', () => setLogsVersion((v) => v + 1))
      return () => window.removeEventListener('storage', onStorage)
    }
  }, [])

  const data: DailyLog[] = useMemo(() => {
    void logsVersion
    const foodMap = readNumberMap('fitspo:food_kcals_by_day')
    const waterMap = readNumberMap('fitspo:water_liters_by_day')
    const sleepMap = readNumberMap('fitspo:sleep_hours_by_day')
    // Exercise kcals map (by day)
    let exerciseMap: Record<string, number> = {}
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:exercise_kcals_by_day') : null
      exerciseMap = raw ? (JSON.parse(raw) as Record<string, number>) : {}
    } catch {
      exerciseMap = {}
    }

    const planLogs = readPlanLogs(plan?.id)
    return days.map((d) => ({
      date: d,
      food: planLogs[d]?.food ?? foodMap[d] ?? 0,
      water: planLogs[d]?.water ?? waterMap[d] ?? 0,
      sleep: planLogs[d]?.sleep ?? sleepMap[d] ?? 0,
      exercise: planLogs[d]?.exercise ?? exerciseMap[d] ?? 0,
    }))
  }, [days, logsVersion, plan?.id])

  const enabled = plan.pillars
  const chartData = useMemo<ChartRow[]>(() => {
    const enabledCount = (enabled.food ? 1 : 0) + (enabled.water ? 1 : 0) + (enabled.sleep ? 1 : 0) + (enabled.exercise ? 1 : 0)
    const perShare = enabledCount > 0 ? 100 / enabledCount : 0
    return data.map(d => {
      const row: ChartRow = { date: d.date }
      if (enabled.food) {
        const ratio = targets.foodTarget > 0 ? Math.max(0, Math.min(1, (d.food || 0) / targets.foodTarget)) : 0
        row.food = Math.round(ratio * perShare * 10) / 10
      }
      if (enabled.water) {
        const ratio = targets.waterTarget > 0 ? Math.max(0, Math.min(1, (d.water || 0) / targets.waterTarget)) : 0
        row.water = Math.round(ratio * perShare * 10) / 10
      }
      if (enabled.sleep) {
        const ratio = targets.sleepTarget > 0 ? Math.max(0, Math.min(1, (d.sleep || 0) / targets.sleepTarget)) : 0
        row.sleep = Math.round(ratio * perShare * 10) / 10
      }
      if (enabled.exercise) {
        const ratio = targets.exerciseTarget > 0 ? Math.max(0, Math.min(1, (d.exercise || 0) / targets.exerciseTarget)) : 0
        row.exercise = Math.round(ratio * perShare * 10) / 10
      }
      return row
    })
  }, [data, enabled, targets])

  const config = useMemo<ChartConfig>(() => {
    const cfg: ChartConfig = {}
    if (enabled.food) cfg.food = { label: 'Food', color: COLORS.food }
    if (enabled.water) cfg.water = { label: 'Water', color: COLORS.water }
    if (enabled.sleep) cfg.sleep = { label: 'Sleep', color: COLORS.sleep }
    if (enabled.exercise) cfg.exercise = { label: 'Exercise', color: COLORS.exercise }
    return cfg
  }, [enabled])

  return (
    <ChartContainer config={config} className="w-full h-64">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          tickMargin={8}
          axisLine={false}
          tickFormatter={(v: string) => (typeof v === 'string' ? v.slice(5) : v)}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value) => (<span>{Number(value ?? 0)}%</span>)} />} />
        <ChartLegend content={<ChartLegendContent />} />
        {enabled.food && (
          <Bar dataKey="food" stackId="a" fill="var(--color-food)" />
        )}
        {enabled.water && (
          <Bar dataKey="water" stackId="a" fill="var(--color-water)" />
        )}
        {enabled.sleep && (
          <Bar dataKey="sleep" stackId="a" fill="var(--color-sleep)" />
        )}
        {enabled.exercise && (
          <Bar dataKey="exercise" stackId="a" fill="var(--color-exercise)" />
        )}
      </BarChart>
    </ChartContainer>
  )
}

export default StackedPillarChart



"use client"

import { useMemo } from 'react'
import type { Plan } from './plan-types'

export function PlanGradientCard({ userId, plan }: { userId: string; plan?: Plan | null }) {
  const scores = useMemo(() => {
    if (!plan) return { food: 1, water: 1, sleep: 1, exercise: 1 }
    const enabled = plan.pillars
    return {
      food: enabled.food ? 0.8 : 1,
      water: enabled.water ? 0.6 : 1,
      sleep: enabled.sleep ? 0.7 : 1,
      exercise: enabled.exercise ? 0.75 : 1,
    }
  }, [plan])

  const toColor = (hex: string, mul: number) => {
    const opacity = Math.max(0.25, Math.min(1, mul))
    const [r, g, b] = hexToRgb(hex)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  const hexToRgb = (hex: string): [number, number, number] => {
    const m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)
    if (!m) return [200, 200, 200]
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
  }

  const style = {
    background:
      `conic-gradient(${toColor('#f59e0b', scores.food)} 0 90deg, ${toColor('#3b82f6', scores.water)} 90deg 180deg, ${toColor('#8b5cf6', scores.sleep)} 180deg 270deg, ${toColor('#fb923c', scores.exercise)} 270deg 360deg)`,
  } as React.CSSProperties

  return (
    <div className="rounded border p-4 flex items-center gap-6">
      <div className="w-40 h-40 rounded-full" style={style} />
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>Food: <span className="tabular-nums">{Math.round(scores.food * 100)}</span></div>
        <div>Water: <span className="tabular-nums">{Math.round(scores.water * 100)}</span></div>
        <div>Sleep: <span className="tabular-nums">{Math.round(scores.sleep * 100)}</span></div>
        <div>Exercise: <span className="tabular-nums">{Math.round(scores.exercise * 100)}</span></div>
      </div>
    </div>
  )
}

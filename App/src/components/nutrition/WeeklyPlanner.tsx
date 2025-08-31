"use client"

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { RecipeCategory } from '@/lib/nutrition/types'
import { useNutrition } from '@/lib/nutrition/store'

const categories: RecipeCategory[] = ['Breakfast','Lunch','Dinner','Desserts & Snacks']

export function WeeklyPlanner() {
  const { state } = useNutrition()
  const days = useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    const day = start.getDay() || 7
    start.setDate(start.getDate() - (day - 1))
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d.toISOString().slice(0, 10)
    })
  }, [])

  return (
    <div className="grid gap-3">
      <div className="flex justify-between">
        <div className="text-sm text-muted-foreground">Drag recipes into slots (coming soon)</div>
        <div className="flex gap-2">
          <Button variant="outline">Auto-generate</Button>
          <Button>Add to workout calendar</Button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {days.map(date => (
          <Card key={date} className="p-3">
            <div className="font-medium mb-2">{date}</div>
            <div className="grid gap-2">
              {categories.map(cat => (
                <div key={cat} className="rounded border border-border/50 p-2 text-xs flex items-center justify-between">
                  <span>{cat}</span>
                  <Button size="sm" variant="ghost">Assign</Button>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}



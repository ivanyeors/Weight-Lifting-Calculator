"use client"

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { RecipeCategory, Recipe } from '@/lib/nutrition/types'
import { useNutrition } from '@/lib/nutrition/store'
import { HEALTHY_RECIPES } from '@/lib/nutrition/recipes'

const categories: RecipeCategory[] = ['Breakfast','Lunch','Dinner','Desserts & Snacks']

export function WeeklyPlanner() {
  const { state, dispatch } = useNutrition()
  const [assigning, setAssigning] = useState<{ date: string; category: RecipeCategory } | null>(null)
  const recipes = state.recipes.length ? state.recipes : HEALTHY_RECIPES
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
                  <Button size="sm" variant="ghost" onClick={() => setAssigning({ date, category: cat })}>Assign</Button>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      {assigning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-md p-4 w-full max-w-md grid gap-3">
            <div className="font-medium">Assign recipe</div>
            <div className="text-xs text-muted-foreground">{assigning.date} • {assigning.category}</div>
            <div className="grid gap-2 max-h-64 overflow-auto pr-1">
              {recipes.map(r => (
                <button key={r.id} className="text-left rounded border border-border/50 p-2 hover:bg-muted" onClick={async () => {
                  // Deduct inventory both local and DB
                  const invIndex = new Map(state.ingredients.map(i => [i.name, i]))
                  try {
                    const { deductForRecipe } = await import('@/lib/nutrition/db')
                    await deductForRecipe(r, state.paxProfile.pax, invIndex)
                    for (const ri of r.ingredients) {
                      const ing = invIndex.get(ri.name)
                      if (!ing) continue
                      const { convertToBase } = await import('@/lib/nutrition/convert')
                      const need = convertToBase(ri.quantity.amount * (state.paxProfile.pax / r.baseServings), ri.quantity.unit)
                      dispatch({ type: 'INVENTORY_DEDUCT', payload: { ingredientId: ing.id, stdAmount: need.value, note: `Planned ${r.name}` } })
                    }
                  } catch {}
                  setAssigning(null)
                }}>
                  <div className="font-medium text-sm">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.category}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssigning(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



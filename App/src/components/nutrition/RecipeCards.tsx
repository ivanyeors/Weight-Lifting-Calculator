"use client"

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { useNutrition } from '@/lib/nutrition/store'
import { calculateRecipeForPax, feasibilityForRecipe } from '@/lib/nutrition/calc'

export function RecipeCards() {
  const { state } = useNutrition()
  const [pax, setPax] = useState(state.paxProfile.pax)
  const invIndex = useMemo(() => new Map(state.ingredients.map(i => [i.name, i])), [state.ingredients])

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {state.recipes.map(r => {
        const feas = feasibilityForRecipe(r, pax, invIndex)
        const res = (() => { try { return calculateRecipeForPax(r, pax, invIndex) } catch { return null } })()
        const macros = res?.perPerson?.macros
        const data = macros ? [
          { name: 'Carbs', value: Math.round(macros.carbs) },
          { name: 'Protein', value: Math.round(macros.protein) },
          { name: 'Fats', value: Math.round(macros.fats) }
        ] : []
        return (
          <Card key={r.id} className="p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.category}</div>
              </div>
              <div className="text-xs text-muted-foreground">Base: {r.baseServings} servings</div>
            </div>
            <div className="grid gap-2">
              <div className="text-xs">Pax: {pax}</div>
              <Slider value={[pax]} min={1} max={20} step={1} onValueChange={(v) => setPax(v[0])} />
            </div>
            {res && (
              <ChartContainer config={{ value: { label: 'g' } }} className="h-40">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ChartContainer>
            )}
            <div className="text-xs">
              {feas.canMake ? (
                <span className="text-emerald-400">Feasible • Max {feas.maxPax}</span>
              ) : (
                <span className="text-amber-400">Need more {feas.limiting?.ingredientId}</span>
              )}
            </div>
            <div className="flex gap-2 mt-auto">
              <Button size="sm" variant="outline">Details</Button>
              <Button size="sm" disabled={!feas.canMake}>Cook & deduct</Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}



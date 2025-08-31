"use client"

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Pie, PieChart, Cell } from 'recharts'
import { useNutrition } from '@/lib/nutrition/store'
import { useMemo } from 'react'

export function DashboardOverview() {
  const { state } = useNutrition()
  const macroTotals = useMemo(() => {
    let carbs = 0, fats = 0, protein = 0
    state.ingredients.forEach(i => {
      const inv = state.inventory[i.id]
      const factor = (inv?.stdRemaining || 0) / 100
      carbs += (i.nutrientsPer100.macros.carbs || 0) * factor
      fats += (i.nutrientsPer100.macros.fats || 0) * factor
      protein += (i.nutrientsPer100.macros.protein || 0) * factor
    })
    return { carbs, fats, protein }
  }, [state.ingredients, state.inventory])
  const pie = [
    { name: 'Carbs', value: macroTotals.carbs },
    { name: 'Fats', value: macroTotals.fats },
    { name: 'Protein', value: macroTotals.protein }
  ]
  const COLORS = ['#60a5fa', '#f97316', '#22c55e']

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card className="p-3 col-span-2">
        <div className="flex gap-2">
          <Input placeholder="Search or quick add (e.g., milk, 1 l)" />
          <Button>Go</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <Card className="p-3">
            <div className="text-sm font-medium">Inventory Macro Pie</div>
            <ChartContainer config={{ value: { label: 'g' } }} className="h-56">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" outerRadius={80} innerRadius={40}>
                  {pie.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </Card>
          <Card className="p-3">
            <div className="text-sm font-medium">Low Stock Alerts</div>
            <div className="text-xs text-muted-foreground mt-2">Auto suggestions coming soon</div>
          </Card>
        </div>
      </Card>
      <Card className="p-3">
        <div className="text-sm font-medium">Quick Actions</div>
        <div className="grid gap-2 mt-2">
          <Button variant="outline">Generate Meal Plan</Button>
          <Button variant="outline">Add Ingredient</Button>
          <Button variant="outline">Generate Recipes</Button>
        </div>
      </Card>
    </div>
  )
}



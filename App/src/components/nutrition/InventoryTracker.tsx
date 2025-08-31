"use client"

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useNutrition } from '@/lib/nutrition/store'
import { formatQuantityBase } from '@/lib/nutrition/convert'

export function InventoryTracker() {
  const { state } = useNutrition()
  const items = useMemo(() => state.ingredients.map(i => {
    const inv = state.inventory[i.id]
    const remain = inv?.stdRemaining || 0
    const pct = i.stdGramsOrMl > 0 ? Math.round((remain / i.stdGramsOrMl) * 100) : 0
    return { id: i.id, name: i.name, remain, pct }
  }), [state.ingredients, state.inventory])

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map(x => (
        <Card key={x.id} className="p-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">{x.name}</div>
            <div className="text-xs text-muted-foreground">{formatQuantityBase(x.remain, 'mass')}</div>
          </div>
          <Progress value={x.pct} className="mt-2" />
        </Card>
      ))}
    </div>
  )
}



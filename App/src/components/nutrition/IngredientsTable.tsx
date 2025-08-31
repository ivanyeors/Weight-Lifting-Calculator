"use client"

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useNutrition } from '@/lib/nutrition/store'
import { formatQuantityBase } from '@/lib/nutrition/convert'

export function IngredientsTable() {
  const { state } = useNutrition()
  const rows = useMemo(() => state.ingredients.map((i) => {
    const inv = state.inventory[i.id]
    const remaining = inv?.stdRemaining ?? 0
    const pct = i.stdGramsOrMl > 0 ? Math.min(100, Math.round((remaining / i.stdGramsOrMl) * 100)) : 0
    return { i, remaining, pct }
  }), [state.ingredients, state.inventory])

  return (
    <Card className="p-3 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Available</TableHead>
            <TableHead>Price/base</TableHead>
            <TableHead>Nutrients/100</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ i, remaining, pct }) => (
            <TableRow key={i.id}>
              <TableCell>{i.name}</TableCell>
              <TableCell>{formatQuantityBase(remaining, 'mass')}</TableCell>
              <TableCell>${i.pricePerBase.toFixed(2)}</TableCell>
              <TableCell>
                <div className="text-xs text-muted-foreground">
                  C {i.nutrientsPer100.macros.carbs}g • F {i.nutrientsPer100.macros.fats}g • P {i.nutrientsPer100.macros.protein}g
                </div>
              </TableCell>
              <TableCell className="min-w-40">
                <Progress value={pct} className={pct < 20 ? 'bg-red-500/20' : pct < 50 ? 'bg-yellow-500/20' : ''} />
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Edit</Button>
                  <Button size="sm" variant="destructive">Delete</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}



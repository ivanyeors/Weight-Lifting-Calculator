"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { NutrientsPer100, Unit } from '@/lib/nutrition/types'
import { upsertFoodAndInventory } from '@/lib/nutrition/db'

type Props = {
  onSubmit: (v: {
    name: string
    amount: number
    unit: Unit
    pricePer100: number
    nutrients: NutrientsPer100
    packageSizeBase?: number
  }) => void
}

export function IngredientForm({ onSubmit }: Props) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [unit, setUnit] = useState<Unit>('g')
  const [pricePer100, setPricePer100] = useState<number>(0)
  const [packageSize, setPackageSize] = useState<number>(0)
  const [carbs, setCarbs] = useState(0)
  const [fats, setFats] = useState(0)
  const [protein, setProtein] = useState(0)

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Chicken breast" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="grid gap-2">
          <Label>Amount</Label>
          <Input type="number" value={amount || ''} onChange={(e) => setAmount(parseFloat(e.target.value))} />
        </div>
        <div className="grid gap-2">
          <Label>Unit</Label>
          <Select value={unit} onValueChange={(v: Unit) => setUnit(v)}>
            <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
            <SelectContent>
              {['mg','g','kg','oz','lb','ml','l','tsp','tbsp','cup','piece'].map(u => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Package size (base g/ml)</Label>
          <Input type="number" value={packageSize || ''} onChange={(e) => setPackageSize(parseFloat(e.target.value))} placeholder="e.g., 1000" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label>Price per 100 base</Label>
          <Input type="number" value={pricePer100 || ''} onChange={(e) => setPricePer100(parseFloat(e.target.value))} placeholder="e.g., 1.25" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="grid gap-2">
          <Label>Carbs/100</Label>
          <Input type="number" value={carbs || ''} onChange={(e) => setCarbs(parseFloat(e.target.value))} />
        </div>
        <div className="grid gap-2">
          <Label>Fats/100</Label>
          <Input type="number" value={fats || ''} onChange={(e) => setFats(parseFloat(e.target.value))} />
        </div>
        <div className="grid gap-2">
          <Label>Protein/100</Label>
          <Input type="number" value={protein || ''} onChange={(e) => setProtein(parseFloat(e.target.value))} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={async () => {
          await upsertFoodAndInventory({
            name,
            unit,
            amount: amount || 0,
            pricePer100Base: pricePer100 || 0,
            nutrientsPer100: { macros: { carbs: carbs || 0, fats: fats || 0, protein: protein || 0 }, micros: {} },
            packageSizeBase: packageSize || undefined,
            category: undefined
          }).catch(() => {})
          onSubmit({
            name,
            amount: amount || 0,
            unit,
            pricePer100: pricePer100 || 0,
            nutrients: { macros: { carbs: carbs || 0, fats: fats || 0, protein: protein || 0 }, micros: {} },
            packageSizeBase: packageSize || undefined
          })
        }}>Add</Button>
      </div>
    </div>
  )
}



"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Slider } from '@/components/ui/slider'
import type { Food } from '@/lib/nutrition/foods'
import { fetchFoods } from '@/lib/nutrition/foods'

function round(n: number, d = 2) { return Math.round(n * Math.pow(10, d)) / Math.pow(10, d) }

export function MacroBuilder() {
  const [foods, setFoods] = useState<Food[]>([])
  const [filter, setFilter] = useState('')
  const [targets, setTargets] = useState({ carbs: 0, fats: 0, protein: 0 })
  const [selection, setSelection] = useState<Record<string, number>>({}) // foodId -> base amount (g/ml or pieces)
  const [pax, setPax] = useState<number | null>(null)
  const [generated, setGenerated] = useState<null | Array<{ food: Food; total: number; perPerson: number }>>(null)

  useEffect(() => { fetchFoods().then(setFoods).catch(() => setFoods([])) }, [])

  const filteredFoods = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? foods.filter(f => f.name.toLowerCase().includes(q)) : foods
  }, [foods, filter])

  const totals = useMemo(() => {
    let carbs = 0, fats = 0, protein = 0
    for (const f of foods) {
      const amt = selection[f.id] || 0
      if (amt <= 0) continue
      const factor = amt / 100
      carbs += (f.carbs_per_100 || 0) * factor
      fats += (f.fats_per_100 || 0) * factor
      protein += (f.protein_per_100 || 0) * factor
    }
    return { carbs, fats, protein }
  }, [foods, selection])

  const macrosSatisfied = useMemo(() => {
    const tol = 3 // grams tolerance
    const okC = targets.carbs > 0 ? totals.carbs >= targets.carbs - tol : true
    const okF = targets.fats > 0 ? totals.fats >= targets.fats - tol : true
    const okP = targets.protein > 0 ? totals.protein >= targets.protein - tol : true
    return okC && okF && okP && (targets.carbs + targets.fats + targets.protein > 0)
  }, [totals, targets])

  const handleAmountChange = (id: string, value: number) => {
    setSelection((prev) => ({ ...prev, [id]: value }))
    setGenerated(null)
  }

  const handleGenerate = () => {
    if (!macrosSatisfied || !pax || pax <= 0) return
    const rows: Array<{ food: Food; total: number; perPerson: number }> = []
    for (const f of foods) {
      const total = selection[f.id] || 0
      if (total <= 0) continue
      rows.push({ food: f, total, perPerson: total / pax })
    }
    setGenerated(rows)
  }

  return (
    <div className="grid gap-3">
      <Card className="p-3 grid gap-3">
        <div className="grid md:grid-cols-3 gap-2">
          <div className="grid gap-1">
            <div className="text-xs text-muted-foreground">Target Carbs (g)</div>
            <Input type="number" value={targets.carbs || ''} onChange={(e) => setTargets({ ...targets, carbs: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="grid gap-1">
            <div className="text-xs text-muted-foreground">Target Fats (g)</div>
            <Input type="number" value={targets.fats || ''} onChange={(e) => setTargets({ ...targets, fats: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="grid gap-1">
            <div className="text-xs text-muted-foreground">Target Protein (g)</div>
            <Input type="number" value={targets.protein || ''} onChange={(e) => setTargets({ ...targets, protein: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="text-xs">Totals: C {round(totals.carbs)}g • F {round(totals.fats)}g • P {round(totals.protein)}g</div>
        <div className="grid md:grid-cols-3 gap-2 items-end">
          <div className="grid gap-1 md:col-span-2">
            <div className="text-xs text-muted-foreground">Search foods</div>
            <Input placeholder="e.g., chicken, potato" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <div className="text-xs text-muted-foreground">Pax</div>
            <Input type="number" value={pax ?? ''} onChange={(e) => setPax(parseInt(e.target.value) || null)} disabled={!macrosSatisfied} />
          </div>
        </div>
      </Card>

      <Card className="p-3 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Food</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Carbs/100</TableHead>
              <TableHead>Fats/100</TableHead>
              <TableHead>Protein/100</TableHead>
              <TableHead className="min-w-48">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFoods.map(f => (
              <TableRow key={f.id}>
                <TableCell>
                  <div className="font-medium text-sm">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{f.category ?? '—'}</div>
                </TableCell>
                <TableCell className="text-xs uppercase">{f.unit_kind === 'mass' ? 'g' : f.unit_kind === 'volume' ? 'ml' : 'pcs'}</TableCell>
                <TableCell className="text-xs">{f.carbs_per_100}</TableCell>
                <TableCell className="text-xs">{f.fats_per_100}</TableCell>
                <TableCell className="text-xs">{f.protein_per_100}</TableCell>
                <TableCell>
                  <div className="grid gap-1">
                    <Input type="number" value={selection[f.id] || ''} onChange={(e) => handleAmountChange(f.id, parseFloat(e.target.value) || 0)} placeholder={f.unit_kind === 'mass' ? 'grams' : f.unit_kind === 'volume' ? 'ml' : 'pieces'} />
                    <Slider value={[Math.min(1000, selection[f.id] || 0)]} min={0} max={1000} step={10} onValueChange={(v) => handleAmountChange(f.id, v[0])} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => { setSelection({}); setGenerated(null); setPax(null) }}>Reset</Button>
        <Button disabled={!macrosSatisfied || !pax || pax <= 0} onClick={handleGenerate}>Generate</Button>
      </div>

      {generated && (
        <Card className="p-3">
          <div className="font-medium mb-2">Portions</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Food</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Per person</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {generated.map((row) => (
                <TableRow key={row.food.id}>
                  <TableCell>{row.food.name}</TableCell>
                  <TableCell>{round(row.total)} {row.food.unit_kind === 'mass' ? 'g' : row.food.unit_kind === 'volume' ? 'ml' : 'pcs'}</TableCell>
                  <TableCell>{round(row.perPerson)} {row.food.unit_kind === 'mass' ? 'g' : row.food.unit_kind === 'volume' ? 'ml' : 'pcs'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

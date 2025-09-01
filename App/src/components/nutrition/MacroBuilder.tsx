"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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

  // Sidebar filter state
  const [unitKinds, setUnitKinds] = useState<{ mass: boolean; volume: boolean; count: boolean }>({ mass: true, volume: true, count: true })
  const [onlySelected, setOnlySelected] = useState(false)
  const [macroRange, setMacroRange] = useState<{ carbs: { min: number | null; max: number | null }; fats: { min: number | null; max: number | null }; protein: { min: number | null; max: number | null } }>({
    carbs: { min: null, max: null },
    fats: { min: null, max: null },
    protein: { min: null, max: null }
  })
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({})

  useEffect(() => { fetchFoods().then(setFoods).catch(() => setFoods([])) }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    foods.forEach(f => { if (f.category) set.add(f.category) })
    return Array.from(set).sort()
  }, [foods])

  const filteredFoods = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const hasCategoryFilters = Object.values(selectedCategories).some(Boolean)
    return foods.filter((f) => {
      if (q && !(f.name.toLowerCase().includes(q) || (f.category?.toLowerCase().includes(q) ?? false))) return false
      if (!unitKinds[f.unit_kind]) return false
      if (hasCategoryFilters) {
        if (!f.category || !selectedCategories[f.category]) return false
      }
      if (macroRange.carbs.min != null && f.carbs_per_100 < macroRange.carbs.min) return false
      if (macroRange.carbs.max != null && f.carbs_per_100 > macroRange.carbs.max) return false
      if (macroRange.fats.min != null && f.fats_per_100 < macroRange.fats.min) return false
      if (macroRange.fats.max != null && f.fats_per_100 > macroRange.fats.max) return false
      if (macroRange.protein.min != null && f.protein_per_100 < macroRange.protein.min) return false
      if (macroRange.protein.max != null && f.protein_per_100 > macroRange.protein.max) return false
      if (onlySelected && !(selection[f.id] > 0)) return false
      return true
    })
  }, [foods, filter, unitKinds, selectedCategories, macroRange, onlySelected, selection])

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
            <div className="text-xs text-muted-foreground">Pax</div>
            <Input type="number" value={pax ?? ''} onChange={(e) => setPax(parseInt(e.target.value) || null)} disabled={!macrosSatisfied} />
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-[260px_1fr]">
        {/* Sidebar Filters */}
        <Card className="p-3 h-max">
          <div className="text-sm font-medium mb-2">Filters</div>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Search foods</Label>
              <Input placeholder="e.g., chicken, potato" value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
            <Separator />
            <div className="grid gap-2">
              <div className="text-xs font-medium mb-1">Unit kind</div>
              <div className="grid gap-1">
                <Checkbox id="uk-mass" variant="chip" checked={unitKinds.mass} onCheckedChange={(v) => setUnitKinds((s) => ({ ...s, mass: Boolean(v) }))}>
                  <span className="text-xs">Mass (g)</span>
                </Checkbox>
                <Checkbox id="uk-volume" variant="chip" checked={unitKinds.volume} onCheckedChange={(v) => setUnitKinds((s) => ({ ...s, volume: Boolean(v) }))}>
                  <span className="text-xs">Volume (ml)</span>
                </Checkbox>
                <Checkbox id="uk-count" variant="chip" checked={unitKinds.count} onCheckedChange={(v) => setUnitKinds((s) => ({ ...s, count: Boolean(v) }))}>
                  <span className="text-xs">Count (pcs)</span>
                </Checkbox>
              </div>
            </div>
            {!!categories.length && (
              <div className="grid gap-2">
                <Separator />
                <div className="text-xs font-medium">Categories</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-64 overflow-auto pr-1">
                  {categories.map((c) => (
                    <Checkbox
                      key={c}
                      id={`cat-${c}`}
                      variant="chip"
                      checked={!!selectedCategories[c]}
                      onCheckedChange={(v) => setSelectedCategories((prev) => ({ ...prev, [c]: Boolean(v) }))}
                    >
                      <span className="text-xs">{c}</span>
                    </Checkbox>
                  ))}
                </div>
              </div>
            )}
            <Separator />
            <div className="grid gap-2">
              <div className="text-xs font-medium">Macros per 100</div>
              <div className="grid grid-cols-2 gap-2 items-end">
                <div className="grid gap-1">
                  <Label className="text-xs">Carbs min</Label>
                  <Input type="number" value={macroRange.carbs.min ?? ''} onChange={(e) => setMacroRange((m) => ({ ...m, carbs: { ...m.carbs, min: e.target.value === '' ? null : parseFloat(e.target.value) } }))} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Carbs max</Label>
                  <Input type="number" value={macroRange.carbs.max ?? ''} onChange={(e) => setMacroRange((m) => ({ ...m, carbs: { ...m.carbs, max: e.target.value === '' ? null : parseFloat(e.target.value) } }))} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Fats min</Label>
                  <Input type="number" value={macroRange.fats.min ?? ''} onChange={(e) => setMacroRange((m) => ({ ...m, fats: { ...m.fats, min: e.target.value === '' ? null : parseFloat(e.target.value) } }))} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Fats max</Label>
                  <Input type="number" value={macroRange.fats.max ?? ''} onChange={(e) => setMacroRange((m) => ({ ...m, fats: { ...m.fats, max: e.target.value === '' ? null : parseFloat(e.target.value) } }))} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Protein min</Label>
                  <Input type="number" value={macroRange.protein.min ?? ''} onChange={(e) => setMacroRange((m) => ({ ...m, protein: { ...m.protein, min: e.target.value === '' ? null : parseFloat(e.target.value) } }))} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Protein max</Label>
                  <Input type="number" value={macroRange.protein.max ?? ''} onChange={(e) => setMacroRange((m) => ({ ...m, protein: { ...m.protein, max: e.target.value === '' ? null : parseFloat(e.target.value) } }))} />
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-2">
              <Checkbox id="only-selected" variant="chip" checked={onlySelected} onCheckedChange={(v) => setOnlySelected(Boolean(v))}>
                <span className="text-xs">Only show selected</span>
              </Checkbox>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => { setFilter(''); setUnitKinds({ mass: true, volume: true, count: true }); setSelectedCategories({}); setMacroRange({ carbs: { min: null, max: null }, fats: { min: null, max: null }, protein: { min: null, max: null } }); setOnlySelected(false) }}>Reset filters</Button>
            </div>
          </div>
        </Card>

        {/* Main content */}
        <div className="grid gap-3">
          <Card className="p-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Food</TableHead>
                  <TableHead>Carbs, Fats, Protein</TableHead>
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 md:w-48 bg-muted rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-transparent"
                            style={{
                              width: `${(((f.carbs_per_100 || 0)) / Math.max(1, ((f.carbs_per_100 || 0) + (f.fats_per_100 || 0) + (f.protein_per_100 || 0)))) * 100}%`
                            }}
                          />
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 to-transparent"
                            style={{
                              width: `${(((f.fats_per_100 || 0)) / Math.max(1, ((f.carbs_per_100 || 0) + (f.fats_per_100 || 0) + (f.protein_per_100 || 0)))) * 100}%`
                            }}
                          />
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-transparent"
                            style={{
                              width: `${(((f.protein_per_100 || 0)) / Math.max(1, ((f.carbs_per_100 || 0) + (f.fats_per_100 || 0) + (f.protein_per_100 || 0)))) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-2">
                        <div className="flex items-center gap-2">
                          <Input
                            className="h-8 w-24 text-xs"
                            type="number"
                            min={0}
                            step={f.unit_kind === 'count' ? 1 : 10}
                            value={selection[f.id] || ''}
                            onChange={(e) => handleAmountChange(f.id, parseFloat(e.target.value) || 0)}
                            placeholder={f.unit_kind === 'mass' ? 'grams' : f.unit_kind === 'volume' ? 'ml' : 'pieces'}
                            aria-label={`Amount in ${f.unit_kind === 'mass' ? 'grams' : f.unit_kind === 'volume' ? 'milliliters' : 'pieces'}`}
                          />
                          <span className="text-[10px] uppercase text-muted-foreground">
                            {f.unit_kind === 'mass' ? 'g' : f.unit_kind === 'volume' ? 'ml' : 'pcs'}
                          </span>
                        </div>
                        <Slider
                          className="mt-1"
                          value={[Math.min(f.unit_kind === 'count' ? 50 : (f.unit_kind === 'volume' ? 2000 : 1000), selection[f.id] || 0)]}
                          min={0}
                          max={f.unit_kind === 'count' ? 50 : (f.unit_kind === 'volume' ? 2000 : 1000)}
                          step={f.unit_kind === 'count' ? 1 : 10}
                          onValueChange={(v) => handleAmountChange(f.id, v[0])}
                        />
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
      </div>
    </div>
  )
}

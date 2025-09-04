"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Food } from '@/lib/nutrition/foods'
import { fetchFoods } from '@/lib/nutrition/foods'
import { fetchUserInventory, upsertUserInventoryByFoodId } from '@/lib/nutrition/db'
import { HEALTHY_RECIPES } from '@/lib/nutrition/recipes'

function round(n: number, d = 2) { return Math.round(n * Math.pow(10, d)) / Math.pow(10, d) }

export function IngredientList() {
  const [foods, setFoods] = useState<Food[]>([])
  const [filter, setFilter] = useState('')
  const [targets, setTargets] = useState({ carbs: 0, fats: 0, protein: 0 })
  const [selection, setSelection] = useState<Record<string, number>>({}) // foodId -> base amount (g/ml or pieces)
  const [pax, setPax] = useState<number | null>(null)
  const [generated, setGenerated] = useState<null | Array<{ food: Food; total: number; perPerson: number }>>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)

  // Sidebar filter state
  const [onlySelected, setOnlySelected] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({})

  useEffect(() => { fetchFoods().then(setFoods).catch(() => setFoods([])) }, [])
  useEffect(() => {
    ;(async () => {
      try {
        const inv = await fetchUserInventory()
        setSelection(inv)
      } catch (e) {
        console.warn('Failed to load inventory', e)
      }
    })()
  }, [])

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
      if (hasCategoryFilters) {
        if (!f.category || !selectedCategories[f.category]) return false
      }
      if (onlySelected && !(selection[f.id] > 0)) return false
      return true
    })
  }, [foods, filter, selectedCategories, onlySelected, selection])

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

  // Calculate inventory and available recipes counts
  const inventoryCount = useMemo(() => {
    return Object.values(selection).filter(amount => amount > 0).length
  }, [selection])

  const availableRecipesCount = useMemo(() => {
    return HEALTHY_RECIPES.filter(recipe => {
      return recipe.ingredients.every(ingredient => {
        // Find matching food by name (case insensitive)
        const food = foods.find(f => f.name.toLowerCase() === ingredient.name.toLowerCase())
        if (!food) return false

        const availableAmount = selection[food.id] || 0
        if (availableAmount <= 0) return false

        // Convert ingredient quantity to base unit (g/ml)
        let ingredientAmount = ingredient.quantity.amount
        switch (ingredient.quantity.unit) {
          case 'g':
          case 'ml':
            // Already in base unit
            break
          case 'kg':
            ingredientAmount *= 1000
            break
          case 'mg':
            ingredientAmount /= 1000
            break
          case 'l':
            ingredientAmount *= 1000
            break
          case 'cup':
            ingredientAmount *= 240 // Approximate conversion
            break
          case 'tbsp':
            ingredientAmount *= 15
            break
          case 'tsp':
            ingredientAmount *= 5
            break
          case 'piece':
            // For pieces, assume we need at least 1 piece
            ingredientAmount = 1
            break
          default:
            return false // Unknown unit
        }

        return availableAmount >= ingredientAmount
      })
    }).length
  }, [selection, foods])

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const handleAmountChange = (id: string, value: number) => {
    setSelection((prev) => ({ ...prev, [id]: value }))
    setGenerated(null)
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(async () => {
      try {
        await upsertUserInventoryByFoodId(id, { std_remaining: value })
        try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('fitspo:inventory_changed')) } catch { /* ignore */ }
      } catch (e) {
        console.warn('Failed to save inventory', e)
      }
    }, 500)
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

  const handleResetInventory = async () => {
    setSelection({})
    setGenerated(null)
    setPax(null)
    setShowResetDialog(false)

    // Clear all inventory in database
    try {
      for (const f of foods) {
        await upsertUserInventoryByFoodId(f.id, { std_remaining: 0 })
      }
      try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('fitspo:inventory_changed')) } catch { /* ignore */ }
    } catch (e) {
      console.warn('Failed to clear inventory', e)
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid md:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{inventoryCount}</div>
            <div className="text-sm text-muted-foreground">Ingredients in Inventory</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{availableRecipesCount}</div>
            <div className="text-sm text-muted-foreground">Available Recipes</div>
          </div>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-[260px_1fr]">
        {/* Sidebar Filters */}
        <Card className="p-3 h-max">
          <div className="text-sm font-medium mb-2">Filters</div>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Search foods</Label>
              <Input placeholder="e.g., chicken, potato" value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="only-selected" variant="chip" checked={onlySelected} onCheckedChange={(v) => setOnlySelected(Boolean(v))}>
                <span className="text-xs">Available stock</span>
              </Checkbox>
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
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => { setFilter(''); setSelectedCategories({}); setOnlySelected(false) }}>Reset filters</Button>
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
                  <TableHead className="min-w-48">Inventory</TableHead>
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
                        <div className="h-2 w-32 md:w-48 bg-muted rounded-full flex gap-[1px]">
                          <div
                            className="h-full rounded-full bg-amber-500"
                            style={{ flexGrow: (f.carbs_per_100 || 0), flexBasis: 0 }}
                          />
                          <div
                            className="h-full rounded-full bg-rose-500"
                            style={{ flexGrow: (f.fats_per_100 || 0), flexBasis: 0 }}
                          />
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ flexGrow: (f.protein_per_100 || 0), flexBasis: 0 }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-2">
                        <div className="flex items-center gap-2">
                          <Input
                            className="h-8 w-24 text-xs text-center"
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

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowResetDialog(true)}>Reset inventory</Button>
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

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset All Inventory</DialogTitle>
            <DialogDescription>
              This will set all ingredient inventory amounts to 0. This action cannot be undone.
              Are you sure you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetInventory}>
              Reset All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

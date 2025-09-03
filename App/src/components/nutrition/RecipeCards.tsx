"use client"

import { useMemo, useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { useNutrition } from '@/lib/nutrition/store'
import { calculateRecipeForPax, feasibilityForRecipe } from '@/lib/nutrition/calc'
import { HEALTHY_RECIPES, filterRecipes, type HealthyFilter } from '@/lib/nutrition/recipes'
import { CalendarView } from '@/components/workout-plans/calendar-view'
import { convertToBase, formatQuantityBase, getUnitKind } from '@/lib/nutrition/convert'
import { Copy } from 'lucide-react'
import type { Food } from '@/lib/nutrition/foods'
import { fetchFoods } from '@/lib/nutrition/foods'
import { toast } from 'sonner'
import { upsertFood, fetchUserInventory, deductForRecipe } from '@/lib/nutrition/db'
import type { Ingredient, NutrientsPer100 } from '@/lib/nutrition/types'

export function RecipeCards() {
  const { state, dispatch } = useNutrition()
  const [pax, setPax] = useState(state.paxProfile.pax)
  const [filters, setFilters] = useState<HealthyFilter[]>([])
  const [search, setSearch] = useState('')
  const [onlyFeasible, setOnlyFeasible] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [foods, setFoods] = useState<Food[]>([])
  const [remoteInv, setRemoteInv] = useState<Record<string, number>>({})

  // Load canonical foods from DB for name alignment
  useEffect(() => { fetchFoods().then(setFoods).catch(() => setFoods([])) }, [])

  // Load remote user inventory and keep it in sync via window events
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const inv = await fetchUserInventory()
        if (active) setRemoteInv(inv)
      } catch { /* ignore */ }
    }
    load()
    const onChange = () => { void load() }
    try { if (typeof window !== 'undefined') window.addEventListener('fitspo:inventory_changed', onChange) } catch { /* ignore */ }
    return () => {
      active = false
      try { if (typeof window !== 'undefined') window.removeEventListener('fitspo:inventory_changed', onChange) } catch { /* ignore */ }
    }
  }, [])

  // Seed healthy recipes into state if empty
  const recipes = state.recipes.length ? state.recipes : HEALTHY_RECIPES

  // Build a live inventory-backed ingredient index by name (merge remote DB with local store)
  const invIndex = useMemo(() => {
    const byName = new Map<string, Ingredient>()

    // Map food_id -> name
    const foodIdToName = new Map<string, string>()
    for (const f of foods) foodIdToName.set(f.id, f.name)

    // Remote amounts keyed by food name
    const remoteByName = new Map<string, number>()
    for (const [foodId, amt] of Object.entries(remoteInv || {})) {
      const nm = foodIdToName.get(foodId)
      if (nm) remoteByName.set(nm, Number(amt) || 0)
    }

    // Prime with local ingredients
    for (const ing of state.ingredients) {
      const entry = state.inventory[ing.id]
      const localAmount = entry ? entry.stdRemaining : ing.stdGramsOrMl
      const amount = remoteByName.has(ing.name) ? (remoteByName.get(ing.name) as number) : localAmount
      byName.set(ing.name, { ...ing, stdGramsOrMl: amount })
    }

    // Add remote-only foods as pseudo-ingredients
    for (const f of foods) {
      if (!remoteByName.has(f.name)) continue
      const name = f.name
      if (byName.has(name)) continue
      const nutrients: NutrientsPer100 = {
        macros: {
          carbs: f.carbs_per_100 || 0,
          fats: f.fats_per_100 || 0,
          protein: f.protein_per_100 || 0
        },
        micros: f.micros || {}
      }
      const pseudo: Ingredient = {
        id: `food:${f.id}`,
        name,
        available: { amount: 0, unit: 'g' },
        stdGramsOrMl: remoteByName.get(name) || 0,
        pricePerBase: 0,
        nutrientsPer100: nutrients,
        category: f.category || undefined
      }
      byName.set(name, pseudo)
    }

    return byName
  }, [state.ingredients, state.inventory, foods, remoteInv])

  // Build available diet tags from recipes
  const dietTags = useMemo(() => {
    const s = new Set<string>()
    recipes.forEach(r => {
      if (Array.isArray(r.diets)) r.diets.forEach(d => s.add(d))
    })
    return Array.from(s).sort()
  }, [recipes])

  const filtered = useMemo(() => {
    // base filter using existing healthy filters
    let base = filterRecipes(recipes, filters)
    const q = search.trim().toLowerCase()
    if (q) {
      base = base.filter(r => r.name.toLowerCase().includes(q) || r.ingredients.some(i => i.name.toLowerCase().includes(q)))
    }
    const hasCats = Object.values(selectedCategories).some(Boolean)
    if (hasCats) {
      base = base.filter(r => {
        const ds = Array.isArray(r.diets) ? r.diets : []
        if (ds.length === 0) return false
        return ds.some(d => selectedCategories[d])
      })
    }
    if (onlyFeasible) {
      base = base.filter(r => feasibilityForRecipe(r, pax, invIndex).canMake)
    }
    return base
  }, [recipes, filters, search, selectedCategories, onlyFeasible, pax, invIndex])

  // Name normalization and mapping to inventory/database names
  const normalize = (s: string) => {
    const cleaned = s
      .toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/\b(raw|cooked|uncooked)\b/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
    // singularize
    const singular = cleaned.split(' ').map(w => {
      if (/(ss)$/.test(w)) return w
      if (/(ies)$/.test(w)) return w.replace(/ies$/i, 'y')
      if (/(ches|shes|xes|zes|ses)$/.test(w)) return w.replace(/es$/i, '')
      if (/(s)$/.test(w)) return w.replace(/s$/i, '')
      return w
    }).join(' ')
    return singular.replace(/\s+/g, ' ').trim()
  }
  const canonicalNameMap = useMemo(() => {
    const map = new Map<string, string>()
    // Prioritize current inventory ingredient names
    for (const ing of state.ingredients) {
      map.set(normalize(ing.name), ing.name)
    }
    // Then supplement with foods database
    for (const f of foods) {
      const key = normalize(f.name)
      if (!map.has(key)) map.set(key, f.name)
    }
    return map
  }, [state.ingredients, foods])

  const syncRecipeNames = (r: typeof recipes[number]) => {
    const synced = { ...r, ingredients: r.ingredients.map(ri => {
      const key = normalize(ri.name)
      const canon = canonicalNameMap.get(key) || ri.name
      return { ...ri, name: canon }
    }) }
    return synced
  }

  const openAddDrawer = (recipeId: string) => {
    setSelectedRecipeId(recipeId)
    // default preselect next 3 days
    try {
      const today = new Date()
      const next: string[] = []
      for (let i = 0; i < 3; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() + i)
        // Use local YYYY-MM-DD instead of UTC ISO to avoid timezone drift
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        next.push(`${yyyy}-${mm}-${dd}`)
      }
      setSelectedDays(next)
    } catch { setSelectedDays([]) }
    setDrawerOpen(true)
  }

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  const handleSaveAdd = async () => {
    let success = false
    try {
      const r = filtered.find(x => x.id === selectedRecipeId) || recipes.find(x => x.id === selectedRecipeId)
      if (!r) { toast.error('No recipe selected'); return }
      if (selectedDays.length === 0) { toast.error('Select at least one day'); return }
      // Compute kcals defensively; proceed even if calculation fails
      let kcalPerDay = 0
      try {
        const res = calculateRecipeForPax(r, pax, invIndex)
        kcalPerDay = Math.max(0, Math.round(res.perPerson.calories * pax))
      } catch {
        kcalPerDay = 0
      }

      // Ensure foods DB entries exist and are updated for ingredients used by this recipe
      try {
        for (const ri of r.ingredients) {
          const ing = state.ingredients.find(ii => ii.name === ri.name)
          const unit_kind = getUnitKind(ri.quantity.unit)
          await upsertFood({
            name: ri.name,
            category: ing?.category ?? null,
            unit_kind,
            carbs_per_100: ing?.nutrientsPer100?.macros?.carbs ?? 0,
            fats_per_100: ing?.nutrientsPer100?.macros?.fats ?? 0,
            protein_per_100: ing?.nutrientsPer100?.macros?.protein ?? 0,
            micros: ing?.nutrientsPer100?.micros ?? {}
          })
        }
      } catch { /* ignore DB sync errors for UX */ }

      // (Optional) Could upsert recipe metadata here if needed

      // Persist to nutrition progress maps
      const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:food_kcals_by_day') : null
      const map: Record<string, number> = raw ? JSON.parse(raw) : {}
      for (const day of selectedDays) {
        map[day] = Math.max(0, Math.round((map[day] || 0) + kcalPerDay))
      }
      if (typeof window !== 'undefined') localStorage.setItem('fitspo:food_kcals_by_day', JSON.stringify(map))

      // Persist recipes by day for calendar drawer visibility
      try {
        const rawRecipes = typeof window !== 'undefined' ? localStorage.getItem('fitspo:recipes_by_day') : null
        const byDay: Record<string, Array<{ id: string; name: string; pax: number; kcals: number; addedAt: string; status?: 'pending'|'complete'|'missed' }>> = rawRecipes ? JSON.parse(rawRecipes) : {}
        const entry = { id: r.id, name: r.name, pax, kcals: kcalPerDay, addedAt: new Date().toISOString(), status: 'pending' as const }
        for (const day of selectedDays) {
          const list = Array.isArray(byDay[day]) ? byDay[day] : []
          list.push(entry)
          byDay[day] = list
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('fitspo:recipes_by_day', JSON.stringify(byDay))
          try { console.log('[recipes_by_day] saved', { selectedDays, entry }) } catch { /* ignore */ }
        }
      } catch { /* ignore */ }

      // Mirror into active plan logs if any
      try {
        const userId = typeof window !== 'undefined' ? (localStorage.getItem('fitspo:selected_user_id') || '') : ''
        const rawPlans = typeof window !== 'undefined' ? localStorage.getItem('fitspo:plans') : null
        if (userId && rawPlans) {
          const all = JSON.parse(rawPlans) as Record<string, Array<{ id: string; status: string }>>
          const list = all[userId] || []
          const active = list.find(p => p.status === 'active')
          if (active) {
            const key = `fitspo:plan_logs:${active.id}`
            const rawLog = localStorage.getItem(key)
            const log = rawLog ? JSON.parse(rawLog) as Record<string, { date: string; food?: number; water?: number; sleep?: number; exercise?: number }> : {}
            for (const day of selectedDays) {
              const cur = log[day] || { date: day }
              const prev = Number(cur.food || 0)
              log[day] = { ...cur, food: Math.max(0, prev + kcalPerDay) }
            }
            localStorage.setItem(key, JSON.stringify(log))
          }
        }
      } catch { /* ignore */ }

      try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('fitspo:logs_changed')) } catch { /* ignore */ }

      // Notify user
      try {
        const count = selectedDays.length
        const label = count === 1 ? 'day' : 'days'
        toast.success(`Added "${r.name}" to ${count} ${label}`)
      } catch { /* ignore */ }

      // Deduct inventory immediately so IngredientList reflects counts
      try {
        const { convertToBase } = await import('@/lib/nutrition/convert')
        for (const day of selectedDays) {
          void day // just to reflect multiple days consumption
          for (const ri of r.ingredients) {
            const ing = state.ingredients.find(ii => ii.name === ri.name)
            if (!ing) continue
            const need = convertToBase(ri.quantity.amount * (pax / r.baseServings), ri.quantity.unit)
            dispatch({ type: 'INVENTORY_DEDUCT', payload: { ingredientId: ing.id, stdAmount: need.value, note: `Scheduled ${r.name}` } })
          }
        }
      } catch { /* ignore */ }

      // Deduct remote DB inventory and notify
      try {
        await deductForRecipe(r, pax, invIndex)
        try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('fitspo:inventory_changed')) } catch { /* ignore */ }
      } catch { /* ignore */ }

      success = true
    } catch (e) {
      try { console.error('Failed to save recipe days', e) } catch { /* ignore */ }
      try { toast.error('Failed to save. Please try again.') } catch { /* ignore */ }
    } finally {
      if (success) setDrawerOpen(false)
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-[260px_1fr]">
        {/* Sidebar Filters (mirrors IngredientList layout) */}
        <Card className="p-3 h-max">
          <div className="text-sm font-medium mb-2">Filters</div>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Search recipes</Label>
              <Input placeholder="e.g., chicken, pasta" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Separator />
            <div className="grid gap-2">
              <div className="text-xs font-medium">Quick filters</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={filters.includes('protein-load') ? 'default' : 'outline'} onClick={() => setFilters(f => f.includes('protein-load') ? f.filter(x => x !== 'protein-load') : [...f, 'protein-load'])}>Protein load</Button>
                <Button size="sm" variant={filters.includes('under-500kcals') ? 'default' : 'outline'} onClick={() => setFilters(f => f.includes('under-500kcals') ? f.filter(x => x !== 'under-500kcals') : [...f, 'under-500kcals'])}>Under 500 kcals</Button>
              </div>
            </div>
            {!!dietTags.length && (
              <div className="grid gap-2">
                <Separator />
                <div className="text-xs font-medium">Diet types</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-64 overflow-auto pr-1">
                  {dietTags.map((c) => (
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
              <div className="text-xs font-medium">Pax</div>
              <div className="text-xs">Pax: {pax}</div>
              <Slider value={[pax]} min={1} max={20} step={1} onValueChange={(v) => setPax(v[0])} />
              <div className="flex items-center gap-2">
                <Checkbox id="only-feasible" variant="chip" checked={onlyFeasible} onCheckedChange={(v) => setOnlyFeasible(Boolean(v))}>
                  <span className="text-xs">Only show feasible</span>
                </Checkbox>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => { setSearch(''); setFilters([]); setSelectedCategories({}); setOnlyFeasible(false); }}>Reset filters</Button>
            </div>
          </div>
        </Card>

        {/* Cards */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {filtered.map(r0 => {
        const r = syncRecipeNames(r0)
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
            <div className={!feas.canMake ? 'opacity-60' : ''}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.category}
                  {Array.isArray(r.diets) && r.diets.length > 0 ? (
                    <>
                      {' '}•{' '}
                      {r.diets.join(', ')}
                    </>
                  ) : null}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">{r.baseServings}</div>
            </div>
            {/* Pax slider managed in sidebar */}
            <ChartContainer config={{ value: { label: 'g' } }} className="w-full h-40 aspect-auto px-0">
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} tickMargin={0} domain={[0, 'dataMax']} />
                <YAxis
                  type="category"
                  dataKey="name"
                  mirror
                  tickLine={false}
                  axisLine={false}
                  tickMargin={0}
                  width={0}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                <ChartTooltip content={<ChartTooltipContent />} />
              </BarChart>
            </ChartContainer>
            {/* Ingredients & shortages for current pax */}
            <div className="grid gap-1 text-xs">
              {r.ingredients.map((ri) => {
                const scale = pax / r.baseServings
                const need = convertToBase(ri.quantity.amount * scale, ri.quantity.unit)
                const ing = invIndex.get(ri.name)
                const available = ing ? ing.stdGramsOrMl : 0
                const missingBase = Math.max(0, need.value - available)
                // Format needed amount in the recipe's unit for clarity
                const needDisplay = (() => {
                  const kind = need.kind
                  if (kind === 'mass' || kind === 'volume') {
                    // show both in unit and base compact
                    return `${Math.round(ri.quantity.amount * scale * 100) / 100} ${ri.quantity.unit} (${formatQuantityBase(need.value, kind)})`
                  }
                  return `${Math.round(ri.quantity.amount * scale)} pcs`
                })()
                const missingDisplay = missingBase > 0 ? formatQuantityBase(missingBase, need.kind) : null
                return (
                  <div key={ri.name} className="flex items-center justify-between">
                    <div className="truncate">
                      <span className="font-medium">{ri.name}</span>
                      <span className="text-muted-foreground"> — {needDisplay}</span>
                    </div>
                    {missingDisplay ? (
                      <span className="text-amber-400 whitespace-nowrap">Missing {missingDisplay}</span>
                    ) : (
                      <span className="text-emerald-400 whitespace-nowrap">OK</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Macros & Micronutrients */}
            {res && (
              <div className="grid gap-1 text-[11px]">
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-foreground/80 mr-1">Macros (per person):</span>
                  <span className="px-1.5 py-0.5 rounded border bg-muted/40">C {Math.round(res.perPerson.macros.carbs)}g</span>
                  <span className="px-1.5 py-0.5 rounded border bg-muted/40">F {Math.round(res.perPerson.macros.fats)}g</span>
                  <span className="px-1.5 py-0.5 rounded border bg-muted/40">P {Math.round(res.perPerson.macros.protein)}g</span>
                  <span className="px-1.5 py-0.5 rounded border bg-muted/40">{Math.round(res.perPerson.calories)} kcal</span>
                </div>
                <div className="flex flex-wrap gap-1 items-center text-muted-foreground">
                  <span className="text-foreground/80 mr-1">Totals (pax):</span>
                  <span className="px-1.5 py-0.5 rounded border">C {Math.round((res.perPerson.macros.carbs || 0) * pax)}g</span>
                  <span className="px-1.5 py-0.5 rounded border">F {Math.round((res.perPerson.macros.fats || 0) * pax)}g</span>
                  <span className="px-1.5 py-0.5 rounded border">P {Math.round((res.perPerson.macros.protein || 0) * pax)}g</span>
                  <span className="px-1.5 py-0.5 rounded border">{Math.round((res.perPerson.calories || 0) * pax)} kcal</span>
                </div>
                {(() => {
                  try {
                    const entries = Object.entries(res.perPerson.micros || {})
                      .filter(([, v]) => typeof v === 'number' && isFinite(v))
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .slice(0, 6)
                    if (entries.length === 0) return null
                    return (
                      <div className="flex flex-wrap gap-1 items-center text-muted-foreground">
                        <span className="text-foreground/80 mr-1">Micros (per person):</span>
                        {entries.map(([k, v]) => (
                          <span key={k} className="px-1.5 py-0.5 rounded border">{k} {Math.round(Number(v) * 10) / 10}</span>
                        ))}
                      </div>
                    )
                  } catch { return null }
                })()}
              </div>
            )}
            </div>
            <div className="flex gap-2 mt-auto">
              {!feas.canMake && (
              <Button size="sm" variant="outline" onClick={async () => {
                try {
                  const scale = pax / r.baseServings
                  const missingLines: string[] = []
                  for (const ri of r.ingredients) {
                    const need = convertToBase(ri.quantity.amount * scale, ri.quantity.unit)
                    const ing = invIndex.get(ri.name)
                    const available = ing ? ing.stdGramsOrMl : 0
                    const missingBase = Math.max(0, need.value - available)
                    if (missingBase > 0) {
                      const unitFactor = convertToBase(1, ri.quantity.unit).value || 1
                      const inRecipeUnit = missingBase / unitFactor
                      const prettyUnit = `${Math.round(inRecipeUnit * 100) / 100} ${ri.quantity.unit}`
                      missingLines.push(`${ri.name}: ${prettyUnit}`)
                    }
                  }
                  const text = missingLines.join('\n') || 'All ingredients available'
                  if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
                  try { toast.success(missingLines.length > 0 ? 'Copied missing ingredients' : 'All ingredients available') } catch { /* ignore */ }
                } catch { /* ignore */ }
              }}>
                <Copy className="w-3.5 h-3.5 mr-1" /> Missing ingredients
              </Button>
              )}
              <Button size="sm" disabled={!feas.canMake} onClick={() => openAddDrawer(r.id)}>Add</Button>
            </div>
          </Card>
        )
      })}
        </div>
      </div>

      {/* Add Drawer with Calendar and day selector */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[1000px] lg:max-w-[1180px]">
          <SheetHeader>
            <SheetTitle>Add recipe to days</SheetTitle>
            <SheetDescription>Click on dates in Day or Week view to select days for this recipe. Use Month view for navigation only.</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <div className="h-[80vh] rounded border overflow-hidden">
              <CalendarView
                daySelection={{ enabled: true, selectedDays, onToggleDay: toggleDay }}
                hideSidebar
                hideHeader
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveAdd}>Save</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}



"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { Switch } from '@/components/ui/switch'
import type { Food } from '@/lib/nutrition/foods'
import { fetchFoods } from '@/lib/nutrition/foods'
import { fetchUserInventory, upsertUserInventoryByFoodId, type InventoryItem } from '@/lib/nutrition/db'
import { HEALTHY_RECIPES } from '@/lib/nutrition/recipes'
import { feasibilityForRecipe } from '@/lib/nutrition/calc'
import type { Ingredient, NutrientsPer100 } from '@/lib/nutrition/types'

function round(n: number, d = 2) { return Math.round(n * Math.pow(10, d)) / Math.pow(10, d) }
function roundToTwo(n: number) { return Math.round((n + Number.EPSILON) * 100) / 100 }

export function IngredientList() {
  const [foods, setFoods] = useState<Food[]>([])
  const [filter, setFilter] = useState('')
  const [selection, setSelection] = useState<Record<string, InventoryItem>>({}) // foodId -> inventory item with amount and expiry date
  const [generated, setGenerated] = useState<null | Array<{ food: Food; total: number; perPerson: number }>>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)

  // Sidebar filter state
  const [onlySelected, setOnlySelected] = useState(false)
  const [expiringSoon, setExpiringSoon] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({})

  // Date picker popover state
  const [openDatePicker, setOpenDatePicker] = useState<Record<string, boolean>>({})

  // Recipe feasibility state
  const [recipePax] = useState<number>(1)
  const [remoteInv, setRemoteInv] = useState<Record<string, InventoryItem>>({})

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  useEffect(() => { fetchFoods().then(setFoods).catch(() => setFoods([])) }, [])
  useEffect(() => {
    ;(async () => {
      try {
        const inv = await fetchUserInventory()
        setSelection(inv)
      } catch (e) {
        console.warn('Failed to load inventory', e)
        setSelection({})
      }
    })()
  }, [])

  // Load remote inventory for recipe feasibility
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

  const categories = useMemo(() => {
    const set = new Set<string>()
    foods.forEach(f => { if (f.category) set.add(f.category) })
    return Array.from(set).sort()
  }, [foods])

  // Name normalization and inventory index for recipe feasibility
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
    // Prioritize foods database (including aliases)
    for (const f of foods) {
      const key = normalize(f.name)
      if (!map.has(key)) map.set(key, f.name)

      // Also map aliases to the canonical name
      for (const alias of f.aliases || []) {
        const aliasKey = normalize(alias)
        if (!map.has(aliasKey)) map.set(aliasKey, f.name)
      }
    }
    return map
  }, [foods])

  // Build inventory index by name (compatible with feasibilityForRecipe)
  const invIndex = useMemo(() => {
    const byName = new Map<string, Ingredient>()

    // Map food_id -> name
    const foodIdToName = new Map<string, string>()
    for (const f of foods) foodIdToName.set(f.id, f.name)

    // Remote amounts keyed by food name
    const remoteByName = new Map<string, number>()
    for (const [foodId, item] of Object.entries(remoteInv || {})) {
      const nm = foodIdToName.get(foodId)
      if (nm) remoteByName.set(nm, item.amount || 0)
    }

    // Add foods from inventory
    for (const f of foods) {
      const name = f.name
      const amount = remoteByName.get(name) || 0

      const nutrients: NutrientsPer100 = {
        macros: {
          carbs: f.carbs_per_100 || 0,
          fats: f.fats_per_100 || 0,
          protein: f.protein_per_100 || 0
        },
        micros: f.micros || {}
      }

      const ingredient: Ingredient = {
        id: `food:${f.id}`,
        name,
        available: { amount: 0, unit: 'g' },
        stdGramsOrMl: amount,
        pricePerBase: 0,
        nutrientsPer100: nutrients,
        category: f.category || undefined
      }

      byName.set(name, ingredient)

      // Also create mappings for all aliases
      for (const alias of f.aliases || []) {
        if (!byName.has(alias)) {
          byName.set(alias, { ...ingredient, name: alias })
        }
      }
    }

    return byName
  }, [foods, remoteInv])

  const filteredFoods = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const hasCategoryFilters = Object.values(selectedCategories).some(Boolean)
    const now = new Date()
    const twentyDaysFromNow = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)

    const filtered = foods.filter((f) => {
      if (q && !(f.name.toLowerCase().includes(q) || (f.category?.toLowerCase().includes(q) ?? false))) return false
      if (hasCategoryFilters) {
        if (!f.category || !selectedCategories[f.category]) return false
      }
      if (onlySelected && !(selection[f.id]?.amount > 0)) return false

      // Apply expiring soon filter
      if (onlySelected && expiringSoon) {
        const item = selection[f.id]
        if (!item || !item.expiry_date) return false
        const expiryDate = new Date(item.expiry_date)
        if (expiryDate > twentyDaysFromNow) return false
      }

      return true
    })

    // Reset to page 1 when filters change
    setCurrentPage(1)

    return filtered
  }, [foods, filter, selectedCategories, onlySelected, expiringSoon, selection])

  // Pagination logic
  const paginatedFoods = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredFoods.slice(startIndex, endIndex)
  }, [filteredFoods, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredFoods.length / itemsPerPage)

  // Calculate inventory and available recipes counts
  const inventoryCount = useMemo(() => {
    return Object.values(selection).filter(item => item.amount > 0).length
  }, [selection])

  const availableRecipesCount = useMemo(() => {
    return HEALTHY_RECIPES.filter(recipe => {
      try {
        // Use the same feasibility check as RecipeCards
        const feas = feasibilityForRecipe(recipe, recipePax, invIndex)
        return feas.canMake
      } catch {
        // Fallback to simple check if feasibility fails
        return recipe.ingredients.every(ingredient => {
          const canonicalName = canonicalNameMap.get(normalize(ingredient.name)) || ingredient.name
          const invItem = invIndex.get(canonicalName)
          if (!invItem || invItem.stdGramsOrMl <= 0) return false

          // Simple unit conversion for fallback
          let ingredientAmount = ingredient.quantity.amount
          switch (ingredient.quantity.unit) {
            case 'g':
            case 'ml':
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
              ingredientAmount *= 240
              break
            case 'tbsp':
              ingredientAmount *= 15
              break
            case 'tsp':
              ingredientAmount *= 5
              break
            case 'piece':
              ingredientAmount = 1
              break
            default:
              return false
          }

          return invItem.stdGramsOrMl >= ingredientAmount
        })
      }
    }).length
  }, [recipePax, invIndex, canonicalNameMap])

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const handleExpiryDateChange = (id: string, date: Date | undefined) => {
    setSelection((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        expiry_date: date || null,
        include_cost: prev[id]?.include_cost ?? true
      }
    }))
    setGenerated(null)
    // Close the popover immediately after selection
    setOpenDatePicker((prev) => ({ ...prev, [id]: false }))
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(async () => {
      try {
        const currentItem = selection[id]
        await upsertUserInventoryByFoodId(id, {
          std_remaining: currentItem?.amount || 0,
          price_per_base: currentItem?.price_per_base || null,
          expiry_date: date || null
        })
        try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('fitspo:inventory_changed')) } catch { /* ignore */ }
      } catch (e) {
        console.warn('Failed to save expiry date', e)
      }
    }, 500)
  }
  const handleCostChange = (id: string, value: number) => {
    const normalized = roundToTwo(value)
    const pricePerBase = normalized / 100 // Convert from cost per 100 units to cost per unit
    setSelection((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        price_per_base: pricePerBase,
        include_cost: prev[id]?.include_cost ?? true
      }
    }))
    setGenerated(null)
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(async () => {
      try {
        const currentItem = selection[id]
        await upsertUserInventoryByFoodId(id, {
          std_remaining: currentItem?.amount || 0,
          price_per_base: pricePerBase,
          expiry_date: currentItem?.expiry_date || null
        })
        try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('fitspo:inventory_changed')) } catch { /* ignore */ }
      } catch (e) {
        console.warn('Failed to save cost', e)
      }
    }, 500)
  }

  const handleAmountChange = (id: string, value: number) => {
    setSelection((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        amount: value,
        include_cost: prev[id]?.include_cost ?? true
      }
    }))
    setGenerated(null)
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(async () => {
      try {
        const currentItem = selection[id]
        await upsertUserInventoryByFoodId(id, {
          std_remaining: value,
          price_per_base: currentItem?.price_per_base || null,
          expiry_date: currentItem?.expiry_date || null
        })
        try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('fitspo:inventory_changed')) } catch { /* ignore */ }
      } catch (e) {
        console.warn('Failed to save inventory', e)
      }
    }, 500)
  }


  const handleCostToggle = (id: string, excludeCost: boolean) => {
    setSelection((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        include_cost: !excludeCost
      }
    }))
    setGenerated(null)
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(async () => {
      try {
        const currentItem = selection[id]
        await upsertUserInventoryByFoodId(id, {
          std_remaining: currentItem?.amount || 0,
          price_per_base: currentItem?.price_per_base || null,
          expiry_date: currentItem?.expiry_date || null
        })
        try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('fitspo:inventory_changed')) } catch { /* ignore */ }
      } catch (e) {
        console.warn('Failed to save cost toggle', e)
      }
    }, 500)
  }

  const handleResetInventory = async () => {
    setSelection({})
    setGenerated(null)
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
            <div className="flex items-center gap-2 ml-4">
              <Checkbox
                id="expiring-soon"
                variant="chip"
                checked={expiringSoon}
                disabled={!onlySelected}
                onCheckedChange={(v) => setExpiringSoon(Boolean(v))}
              >
                <span className="text-xs">Expiring soon</span>
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
              <Button variant="outline" size="sm" onClick={() => { setFilter(''); setSelectedCategories({}); setOnlySelected(false); setExpiringSoon(false); setOpenDatePicker({}); setCurrentPage(1) }}>Reset filters</Button>
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
                  <TableHead className="min-w-40">Cost</TableHead>
                  <TableHead className="min-w-48">Inventory</TableHead>
                  <TableHead className="min-w-32">Expiry Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFoods.map(f => (
                  <ContextMenu key={f.id}>
                    <ContextMenuTrigger asChild>
                      <TableRow className="cursor-context-menu">
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
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">$</span>
                            <Input
                              className="h-8 w-24 pl-4 pr-2 text-xs text-right"
                              inputMode="decimal"
                              type="text"
                              value={selection[f.id]?.price_per_base ? (selection[f.id].price_per_base! * 100).toFixed(2) : '0.00'}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/[^0-9.]/g, '')
                                const num = cleaned === '' ? 0 : Number(cleaned)
                                if (!Number.isNaN(num)) handleCostChange(f.id, roundToTwo(num))
                              }}
                              onBlur={(e) => {
                                const cleaned = e.target.value.replace(/[^0-9.]/g, '')
                                const num = cleaned === '' ? 0 : Number(cleaned)
                                e.target.value = roundToTwo(num).toFixed(2)
                              }}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        {selection[f.id]?.package_price && selection[f.id]?.package_size_base && (
                          <div className="text-xs text-muted-foreground">
                            Package: ${selection[f.id].package_price!.toFixed(2)} for {selection[f.id].package_size_base}{f.unit_kind === 'mass' ? 'g' : f.unit_kind === 'volume' ? 'ml' : 'pcs'}
                          </div>
                        )}
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
                            value={selection[f.id]?.amount || ''}
                            onChange={(e) => handleAmountChange(f.id, parseFloat(e.target.value) || 0)}
                            placeholder={f.unit_kind === 'mass' ? 'grams' : f.unit_kind === 'volume' ? 'ml' : 'pieces'}
                            aria-label={`Amount in ${f.unit_kind === 'mass' ? 'grams' : f.unit_kind === 'volume' ? 'milliliters' : 'pieces'}`}
                            disabled={(selection[f.id]?.include_cost ?? true) ? !(selection[f.id]?.price_per_base != null && (selection[f.id]?.price_per_base as number) > 0) : false}
                          />
                          <span className="text-[10px] uppercase text-muted-foreground">
                            {f.unit_kind === 'mass' ? 'g' : f.unit_kind === 'volume' ? 'ml' : 'pcs'}
                          </span>
                        </div>
                        <Slider
                          className="mt-1"
                          value={[Math.min(f.unit_kind === 'count' ? 50 : (f.unit_kind === 'volume' ? 2000 : 1000), selection[f.id]?.amount || 0)]}
                          min={0}
                          max={f.unit_kind === 'count' ? 50 : (f.unit_kind === 'volume' ? 2000 : 1000)}
                          step={f.unit_kind === 'count' ? 1 : 10}
                          onValueChange={(v) => handleAmountChange(f.id, v[0])}
                          disabled={(selection[f.id]?.include_cost ?? true) ? !(selection[f.id]?.price_per_base != null && (selection[f.id]?.price_per_base as number) > 0) : false}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Popover
                          open={openDatePicker[f.id] || false}
                          onOpenChange={(open) => {
                            // Only allow opening if there's inventory
                            if (open && (!selection[f.id] || selection[f.id].amount <= 0)) {
                              return; // Don't open if no inventory
                            }
                            setOpenDatePicker((prev) => ({ ...prev, [f.id]: open }));
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-28 justify-start text-left font-normal"
                              disabled={!selection[f.id] || selection[f.id].amount <= 0}
                            >
                              {selection[f.id]?.expiry_date ? (
                                new Date(selection[f.id].expiry_date!).toLocaleDateString()
                              ) : (
                                <span className="text-muted-foreground">Set date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={selection[f.id]?.expiry_date ? new Date(selection[f.id].expiry_date!) : undefined}
                              onSelect={(date) => handleExpiryDateChange(f.id, date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableCell>
                      </TableRow>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem className="flex items-center justify-between gap-2">
                        <span className="text-sm">Exclude cost</span>
                        <Switch
                          checked={!(selection[f.id]?.include_cost ?? true)}
                          onCheckedChange={(checked) => handleCostToggle(f.id, checked)}
                        />
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
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

      {/* Sticky Pagination */}
      {totalPages > 1 && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t mt-4">
          <div className="flex items-center justify-between p-4">
            <div className="text-sm text-muted-foreground">
              Showing {paginatedFoods.length} of {filteredFoods.length} ingredients
            </div>
            <div className="flex items-center gap-2">
              <Pagination>
                <PaginationContent className="gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first page, last page, current page, and pages around current page
                      return page === 1 ||
                             page === totalPages ||
                             (page >= currentPage - 1 && page <= currentPage + 1)
                    })
                    .map((page, index, array) => {
                      const prevPage = array[index - 1]
                      const showEllipsis = prevPage && page - prevPage > 1

                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </React.Fragment>
                      )
                    })}
                </PaginationContent>
              </Pagination>
              <div className="flex items-center gap-1 ml-4">
                <PaginationPrevious
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
                <PaginationNext
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </div>
            </div>
          </div>
        </div>
      )}

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

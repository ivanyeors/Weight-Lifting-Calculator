import type { Ingredient, NutrientsPer100, Recipe, NutritionState, Feasibility } from './types'
import { convertToBase } from './convert'

export function addIngredient(state: NutritionState, params: {
  name: string
  quantity: { amount: number; unit: any }
  pricePerUnit: number // price per 100 base units (g/ml)
  nutrientsPer100: NutrientsPer100
  packageSizeBase?: number | null
}): { ingredient: Ingredient; totalPrice: number } {
  const { value, kind } = convertToBase(params.quantity.amount, params.quantity.unit)
  const stdQuantity = value
  let effectiveQuantity = stdQuantity
  let totalPrice = (stdQuantity / 100) * params.pricePerUnit
  if (params.packageSizeBase && params.packageSizeBase > 0) {
    const packages = Math.ceil(stdQuantity / params.packageSizeBase)
    effectiveQuantity = packages * params.packageSizeBase
    totalPrice = packages * (params.pricePerUnit * (params.packageSizeBase / 100))
  }
  const ingredient: Ingredient = {
    id: cryptoRandomId(),
    name: params.name,
    available: { amount: params.quantity.amount, unit: params.quantity.unit },
    stdGramsOrMl: effectiveQuantity,
    pricePerBase: params.pricePerUnit / 100, // per 1 base unit
    packageSizeBase: params.packageSizeBase ?? undefined,
    packagePrice: params.packageSizeBase ? params.pricePerUnit * (params.packageSizeBase / 100) : undefined,
    nutrientsPer100: params.nutrientsPer100,
    shelfLife: undefined
  }
  return { ingredient, totalPrice }
}

export function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as unknown as { randomUUID: () => string }).randomUUID()
  }
  return 'id-' + Math.random().toString(36).slice(2)
}

export function calculateRecipeForPax(r: Recipe, pax: number, inventoryIndex: Map<string, Ingredient>) {
  const scale = pax / r.baseServings
  const totals = {
    macros: { carbs: 0, fats: 0, protein: 0 },
    micros: {} as Record<string, number>,
    calories: 0,
    cost: 0
  }
  for (const ri of r.ingredients) {
    const ing = inventoryIndex.get(ri.name)
    if (!ing) throw new Error(`Missing ingredient ${ri.name}`)
    const need = convertToBase(ri.quantity.amount * scale, ri.quantity.unit)
    if (need.value > ing.stdGramsOrMl) throw new Error(`Insufficient ${ri.name}`)
    const factor = need.value / 100
    totals.macros.carbs += (ing.nutrientsPer100.macros.carbs || 0) * factor
    totals.macros.fats += (ing.nutrientsPer100.macros.fats || 0) * factor
    totals.macros.protein += (ing.nutrientsPer100.macros.protein || 0) * factor
    for (const [k, v] of Object.entries(ing.nutrientsPer100.micros || {})) {
      totals.micros[k] = (totals.micros[k] || 0) + (v || 0) * factor
    }
    totals.cost += ing.pricePerBase * need.value
  }
  totals.calories = totals.macros.carbs * 4 + totals.macros.protein * 4 + totals.macros.fats * 9
  const perPerson = {
    macros: {
      carbs: totals.macros.carbs / pax,
      fats: totals.macros.fats / pax,
      protein: totals.macros.protein / pax
    },
    micros: Object.fromEntries(Object.entries(totals.micros).map(([k, v]) => [k, v / pax])),
    calories: totals.calories / pax,
    cost: totals.cost / pax
  }
  return { totals, perPerson }
}

export function maxUsersForRecipe(r: Recipe, inventoryIndex: Map<string, Ingredient>): number {
  let maxY = Infinity
  for (const ri of r.ingredients) {
    const ing = inventoryIndex.get(ri.name)
    if (!ing) return 0
    const reqPerServing = convertToBase(ri.quantity.amount, ri.quantity.unit).value
    if (reqPerServing <= 0) return 0
    const can = ing.stdGramsOrMl / reqPerServing
    maxY = Math.min(maxY, can)
  }
  return Math.floor(maxY)
}

export function feasibilityForRecipe(r: Recipe, pax: number, inventoryIndex: Map<string, Ingredient>): Feasibility {
  const scale = pax / r.baseServings
  for (const ri of r.ingredients) {
    const ing = inventoryIndex.get(ri.name)
    if (!ing) return { canMake: false, limiting: { ingredientId: ri.name, needed: 0, available: 0 } }
    const need = convertToBase(ri.quantity.amount * scale, ri.quantity.unit).value
    if (need > ing.stdGramsOrMl) {
      return { canMake: false, limiting: { ingredientId: ri.name, needed: need, available: ing.stdGramsOrMl } }
    }
  }
  return { canMake: true, maxPax: maxUsersForRecipe(r, inventoryIndex) }
}



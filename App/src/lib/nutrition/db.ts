import { supabase } from '@/lib/supabaseClient'
import { getUnitKind, convertToBase } from './convert'

function sanitizeName(s: string): string {
  function singularize(n: string): string {
    const lower = n.toLowerCase()
    if (/(ss)$/.test(lower)) return n // classes, glasses, etc. keep 'ss'
    if (/(ies)$/.test(lower)) return n.replace(/ies$/i, 'y')
    if (/(ches|shes|xes|zes|ses)$/.test(lower)) return n.replace(/es$/i, '')
    if (/(s)$/.test(lower)) return n.replace(/s$/i, '')
    return n
  }
  try {
    const base = s
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\b(raw|cooked|uncooked)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    // Apply singularization token-wise to be safer for multi-word names
    const parts = base.split(' ').map(p => singularize(p))
    return parts.join(' ').replace(/\s+/g, ' ').trim()
  } catch { return s }
}

export type UpsertFoodParams = {
  name: string
  category?: string | null
  unit_kind: 'mass' | 'volume' | 'count'
  carbs_per_100: number
  fats_per_100: number
  protein_per_100: number
  micros?: Record<string, number>
}

async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user?.id) throw new Error('No authenticated user')
  return data.user.id
}

export async function upsertFood(params: UpsertFoodParams): Promise<string> {
  const name = sanitizeName(params.name)
  const { data, error } = await supabase
    .from('foods')
    .upsert({
      name,
      category: params.category ?? null,
      unit_kind: params.unit_kind,
      carbs_per_100: params.carbs_per_100,
      fats_per_100: params.fats_per_100,
      protein_per_100: params.protein_per_100,
      micros: params.micros ?? {}
    }, { onConflict: 'name' })
    .select('id')
  if (error) throw error
  const id = data?.[0]?.id
  if (!id) throw new Error('Failed to upsert food')
  return id as string
}

export async function upsertUserInventoryByFoodId(food_id: string, values: {
  std_remaining: number
  price_per_base?: number | null
  package_size_base?: number | null
  package_price?: number | null
  note?: string | null
}) {
  const user_id = await getUserId()
  const row = {
    user_id,
    food_id,
    std_remaining: values.std_remaining,
    price_per_base: values.price_per_base ?? null,
    package_size_base: values.package_size_base ?? null,
    package_price: values.package_price ?? null,
    note: values.note ?? null
  }
  const { error } = await supabase
    .from('user_food_inventory')
    .upsert(row, { onConflict: 'user_id,food_id' })
  if (error) throw error
}

export async function adjustInventory(food_id: string, deltaStd: number) {
  const user_id = await getUserId()
  const { data, error } = await supabase
    .from('user_food_inventory')
    .select('id, std_remaining')
    .eq('user_id', user_id)
    .eq('food_id', food_id)
    .maybeSingle()
  if (error) throw error
  const current = data?.std_remaining ?? 0
  const next = Math.max(0, Number(current) + deltaStd)
  const { error: uerr } = await supabase
    .from('user_food_inventory')
    .upsert({ user_id, food_id, std_remaining: next }, { onConflict: 'user_id,food_id' })
  if (uerr) throw uerr
  return next
}

export async function fetchUserInventory(): Promise<Record<string, number>> {
  const user_id = await getUserId()
  const { data, error } = await supabase
    .from('user_food_inventory')
    .select('food_id, std_remaining')
    .eq('user_id', user_id)
  if (error) throw error
  const out: Record<string, number> = {}
  for (const row of data ?? []) {
    out[row.food_id as string] = Number(row.std_remaining)
  }
  return out
}

export async function upsertFoodAndInventory(params: {
  name: string
  unit: import('./types').Unit
  amount: number
  pricePer100Base: number
  nutrientsPer100: import('./types').NutrientsPer100
  packageSizeBase?: number | undefined
  category?: string | null
}) {
  const unit_kind = getUnitKind(params.unit)
  const food_id = await upsertFood({
    name: params.name,
    unit_kind,
    category: params.category ?? null,
    carbs_per_100: params.nutrientsPer100.macros.carbs || 0,
    fats_per_100: params.nutrientsPer100.macros.fats || 0,
    protein_per_100: params.nutrientsPer100.macros.protein || 0,
    micros: params.nutrientsPer100.micros || {}
  })
  const base = convertToBase(params.amount, params.unit)
  await upsertUserInventoryByFoodId(food_id, {
    std_remaining: base.value,
    price_per_base: (params.pricePer100Base || 0) / 100,
    package_size_base: params.packageSizeBase ?? null,
    package_price: params.packageSizeBase ? (params.pricePer100Base / 100) * params.packageSizeBase : null,
    note: null
  })
  return { food_id, baseRemaining: base.value }
}

export async function deductForRecipe(recipe: import('./types').Recipe, pax: number, inventoryIndexByName: Map<string, import('./types').Ingredient>) {
  const scale = pax / recipe.baseServings
  for (const ri of recipe.ingredients) {
    const ing = inventoryIndexByName.get(ri.name)
    if (!ing) continue
    const need = convertToBase(ri.quantity.amount * scale, ri.quantity.unit)
    // We need food_id to adjust in DB. We don't store food_id on Ingredient; requires lookup by name in foods.
    // Try to fetch by name.
    const { data, error } = await supabase.from('foods').select('id').eq('name', sanitizeName(ri.name)).maybeSingle()
    if (error || !data?.id) continue
    await adjustInventory(data.id as string, -need.value)
  }
}

export async function upsertRecipeWithIngredients(params: {
  recipe_key: string
  name: string
  base_servings: number
  diets: string[]
  category?: string | null
  calories_per_serving?: number
  macros_per_serving?: { carbs?: number; fats?: number; protein?: number }
  micros_per_serving?: Record<string, number>
  ingredients: Array<{ name: string; quantity_amount: number; quantity_unit: import('./types').Unit }>
}) {
  const { data: rec, error: rerr } = await supabase
    .from('nutrition_recipes')
    .upsert({
      recipe_key: params.recipe_key,
      name: params.name,
      base_servings: params.base_servings,
      diets: params.diets,
      category: params.category ?? null,
      calories_per_serving: params.calories_per_serving ?? 0,
      macros_per_serving: params.macros_per_serving ?? {},
      micros_per_serving: params.micros_per_serving ?? {}
    }, { onConflict: 'recipe_key' })
    .select('id')
    .single()
  if (rerr) throw rerr
  const recipe_id = rec.id as string
  // Upsert ingredients
  for (const ing of params.ingredients) {
    let food_id: string | null = null
    try {
      const { data: f } = await supabase.from('foods').select('id').eq('name', ing.name).maybeSingle()
      food_id = (f?.id as string) || null
    } catch { /* ignore */ }
    const row = {
      recipe_id,
      food_id,
      name: ing.name,
      quantity_amount: ing.quantity_amount,
      quantity_unit: ing.quantity_unit
    }
    const { error: ierr } = await supabase
      .from('nutrition_recipe_ingredients')
      .upsert(row, { onConflict: 'recipe_id,name' })
    if (ierr) throw ierr
  }
  return recipe_id
}

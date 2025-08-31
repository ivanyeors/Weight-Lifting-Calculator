export type Unit =
  | 'g'
  | 'kg'
  | 'mg'
  | 'lb'
  | 'oz'
  | 'ml'
  | 'l'
  | 'tsp'
  | 'tbsp'
  | 'cup'
  | 'piece'

export type MacroNutrients = {
  carbs: number // grams per 100g/ml
  fats: number // grams per 100g/ml
  protein: number // grams per 100g/ml
}

export type MicroNutrients = {
  [key: string]: number // e.g., iron (mg), vitaminA (mcg), etc. per 100g/ml
}

export type NutrientsPer100 = {
  macros: MacroNutrients
  micros: MicroNutrients
}

export type Quantity = {
  amount: number
  unit: Unit
}

export type Ingredient = {
  id: string
  name: string
  available: Quantity // user-entered quantity and unit
  stdGramsOrMl: number // standardized base in grams or milliliters
  pricePerBase: number // price per base unit (per 1g or 1ml)
  packageSizeBase?: number // bulk package size in base units (g/ml)
  packagePrice?: number // price per package (derived)
  nutrientsPer100: NutrientsPer100
  shelfLife?: string // ISO date string
  category?: string
}

export type RecipeIngredient = {
  name: string // ingredient name reference
  quantity: Quantity // per serving
}

export type RecipeCategory = 'Breakfast' | 'Lunch' | 'Dinner' | 'Desserts & Snacks'

export type Recipe = {
  id: string
  name: string
  category: RecipeCategory
  baseServings: number
  ingredients: RecipeIngredient[]
  // cached/calculated fields
  totalCostPerServing?: number
  totalNutrientsPerServing?: NutrientsPer100
}

export type PaxProfile = {
  pax: number
  targets?: {
    calories?: number
    macros?: Partial<MacroNutrients>
    micros?: Partial<MicroNutrients>
  }
}

export type InventoryEntry = {
  ingredientId: string
  stdRemaining: number // in base (g/ml)
  history: Array<{
    type: 'add' | 'deduct' | 'restock' | 'waste' | 'undo'
    amount: number
    at: string
    note?: string
  }>
}

export type WeeklyPlanDay = {
  date: string // yyyy-MM-dd
  slots: Array<{
    category: RecipeCategory
    recipeId?: string
    pax?: number
    kcalIn?: number
  }>
}

export type WeeklyPlan = {
  weekOf: string // yyyy-MM-dd (Monday)
  days: WeeklyPlanDay[]
  summary?: {
    totalCost: number
    totalCalories: number
    macros: MacroNutrients
  }
}

export type NutritionState = {
  ingredients: Ingredient[]
  inventory: Record<string, InventoryEntry> // key: ingredientId
  recipes: Recipe[]
  paxProfile: PaxProfile
  weeklyPlan?: WeeklyPlan
}

export type NutritionAction =
  | { type: 'INGREDIENT_ADD'; payload: Ingredient }
  | { type: 'INGREDIENT_UPDATE'; payload: Ingredient }
  | { type: 'INGREDIENT_DELETE'; payload: { id: string } }
  | { type: 'INVENTORY_DEDUCT'; payload: { ingredientId: string; stdAmount: number; note?: string } }
  | { type: 'INVENTORY_ADD'; payload: { ingredientId: string; stdAmount: number; note?: string } }
  | { type: 'RECIPE_ADD'; payload: Recipe }
  | { type: 'RECIPE_UPDATE'; payload: Recipe }
  | { type: 'RECIPE_DELETE'; payload: { id: string } }
  | { type: 'SET_PAX'; payload: PaxProfile }
  | { type: 'SET_WEEKLY_PLAN'; payload: WeeklyPlan }

export type Feasibility = {
  canMake: boolean
  limiting?: { ingredientId: string; needed: number; available: number }
  maxPax?: number
}



import type { Recipe, Quantity } from './types'

function q(amount: number, unit: Quantity['unit']): Quantity { return { amount, unit } }

export const HEALTHY_RECIPES: Recipe[] = [
  {
    id: 'grilled-chicken-bowl',
    name: 'Grilled Chicken Bowl',
    category: 'Lunch',
    baseServings: 2,
    diets: ['High Protein', 'Balanced', 'Gluten Free', 'Paleo', 'DASH', 'Low Sodium'],
    ingredients: [
      { name: 'Chicken breast', quantity: q(200, 'g') },
      { name: 'Brown rice', quantity: q(2, 'cup') },
      { name: 'Broccoli', quantity: q(200, 'g') },
      { name: 'Olive oil', quantity: q(1, 'tbsp') }
    ]
  },
  {
    id: 'salmon-quinoa-salad',
    name: 'Salmon Quinoa Salad',
    category: 'Dinner',
    baseServings: 2,
    diets: ['Mediterranean', 'Pescatarian', 'Balanced', 'High Protein', 'Gluten Free', 'DASH', 'Low Sodium'],
    ingredients: [
      { name: 'Salmon', quantity: q(250, 'g') },
      { name: 'Quinoa', quantity: q(2, 'cup') },
      { name: 'Spinach', quantity: q(150, 'g') },
      { name: 'Olive oil', quantity: q(1, 'tbsp') }
    ]
  },
  {
    id: 'tofu-stir-fry',
    name: 'Tofu Veggie Stir-Fry',
    category: 'Dinner',
    baseServings: 2,
    diets: ['Vegan', 'Vegetarian', 'Dairy Free', 'Low FODMAP'],
    ingredients: [
      { name: 'Tofu', quantity: q(200, 'g') },
      { name: 'Bell pepper', quantity: q(1, 'piece') },
      { name: 'Mushrooms', quantity: q(150, 'g') },
      { name: 'Soy sauce', quantity: q(2, 'tbsp') }
    ]
  },
  {
    id: 'greek-yogurt-parfait',
    name: 'Greek Yogurt Parfait',
    category: 'Breakfast',
    baseServings: 2,
    diets: ['Balanced', 'Vegetarian', 'DASH', 'Low Sodium'],
    ingredients: [
      { name: 'Greek yogurt', quantity: q(300, 'g') },
      { name: 'Blueberry', quantity: q(1, 'cup') },
      { name: 'Honey', quantity: q(1, 'tbsp') }
    ]
  },
  {
    id: 'keto-egg-avocado-bowl',
    name: 'Keto Egg & Avocado Bowl',
    category: 'Breakfast',
    baseServings: 2,
    diets: ['Keto', 'Low Carb', 'High Protein', 'Gluten Free', 'Paleo'],
    ingredients: [
      { name: 'Egg', quantity: q(4, 'piece') },
      { name: 'Avocado', quantity: q(1, 'piece') },
      { name: 'Olive oil', quantity: q(1, 'tbsp') }
    ]
  },
  {
    id: 'vegan-chickpea-bowl',
    name: 'Vegan Chickpea Power Bowl',
    category: 'Lunch',
    baseServings: 2,
    diets: ['Vegan', 'Vegetarian', 'Dairy Free', 'Mediterranean', 'Balanced'],
    ingredients: [
      { name: 'Chickpea', quantity: q(2, 'cup') },
      { name: 'Quinoa', quantity: q(1, 'cup') },
      { name: 'Spinach', quantity: q(150, 'g') },
      { name: 'Olive oil', quantity: q(1, 'tbsp') }
    ]
  },
  {
    id: 'mediterranean-chicken-salad',
    name: 'Mediterranean Chicken Salad',
    category: 'Dinner',
    baseServings: 2,
    diets: ['Mediterranean', 'High Protein', 'Gluten Free', 'Paleo', 'DASH'],
    ingredients: [
      { name: 'Chicken breast', quantity: q(250, 'g') },
      { name: 'Olive oil', quantity: q(1, 'tbsp') },
      { name: 'Spinach', quantity: q(200, 'g') }
    ]
  }
]

export type HealthyFilter = 'protein-load' | 'under-500kcals'

export function filterRecipes(recipes: Recipe[], _filters: HealthyFilter[]): Recipe[] {
  void _filters

  // Placeholder: In absence of nutrition DB for each recipe, we filter by simple heuristics later
  return recipes
}

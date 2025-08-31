"use client"

import { createContext, useContext, useMemo, useReducer } from 'react'
import type { NutritionAction, NutritionState, Ingredient, Recipe, WeeklyPlan, PaxProfile } from './types'

const initialState: NutritionState = {
  ingredients: [],
  inventory: {},
  recipes: [],
  paxProfile: { pax: 2 }
}

function reducer(state: NutritionState, action: NutritionAction): NutritionState {
  switch (action.type) {
    case 'INGREDIENT_ADD': {
      const ing = action.payload
      return {
        ...state,
        ingredients: [...state.ingredients, ing],
        inventory: {
          ...state.inventory,
          [ing.id]: {
            ingredientId: ing.id,
            stdRemaining: ing.stdGramsOrMl,
            history: [{ type: 'add', amount: ing.stdGramsOrMl, at: new Date().toISOString() }]
          }
        }
      }
    }
    case 'INGREDIENT_UPDATE': {
      const ing = action.payload
      return {
        ...state,
        ingredients: state.ingredients.map(i => (i.id === ing.id ? ing : i))
      }
    }
    case 'INGREDIENT_DELETE': {
      const { id } = action.payload
      const nextInv = { ...state.inventory }
      delete nextInv[id]
      return {
        ...state,
        ingredients: state.ingredients.filter(i => i.id !== id),
        inventory: nextInv
      }
    }
    case 'INVENTORY_ADD': {
      const { ingredientId, stdAmount, note } = action.payload
      const entry = state.inventory[ingredientId]
      if (!entry) return state
      return {
        ...state,
        inventory: {
          ...state.inventory,
          [ingredientId]: {
            ...entry,
            stdRemaining: entry.stdRemaining + stdAmount,
            history: [...entry.history, { type: 'restock', amount: stdAmount, at: new Date().toISOString(), note }]
          }
        }
      }
    }
    case 'INVENTORY_DEDUCT': {
      const { ingredientId, stdAmount, note } = action.payload
      const entry = state.inventory[ingredientId]
      if (!entry) return state
      return {
        ...state,
        inventory: {
          ...state.inventory,
          [ingredientId]: {
            ...entry,
            stdRemaining: Math.max(0, entry.stdRemaining - stdAmount),
            history: [...entry.history, { type: 'deduct', amount: stdAmount, at: new Date().toISOString(), note }]
          }
        }
      }
    }
    case 'RECIPE_ADD': {
      return { ...state, recipes: [...state.recipes, action.payload] }
    }
    case 'RECIPE_UPDATE': {
      const r = action.payload
      return { ...state, recipes: state.recipes.map(x => (x.id === r.id ? r : x)) }
    }
    case 'RECIPE_DELETE': {
      const { id } = action.payload
      return { ...state, recipes: state.recipes.filter(x => x.id !== id) }
    }
    case 'SET_PAX': {
      return { ...state, paxProfile: action.payload }
    }
    case 'SET_WEEKLY_PLAN': {
      return { ...state, weeklyPlan: action.payload }
    }
    default:
      return state
  }
}

type NutritionContextValue = {
  state: NutritionState
  dispatch: React.Dispatch<NutritionAction>
}

const NutritionContext = createContext<NutritionContextValue | null>(null)

export function useNutrition() {
  const ctx = useContext(NutritionContext)
  if (!ctx) throw new Error('useNutrition must be used within NutritionProvider')
  return ctx
}

export function NutritionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <NutritionContext.Provider value={value}>{children}</NutritionContext.Provider>
}



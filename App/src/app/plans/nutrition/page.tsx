"use client"

import { useSelectedUser } from '@/hooks/use-selected-user'
import { UserSwitcher } from '@/components/user-switcher'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { NutritionProvider } from '@/lib/nutrition/store'
import { IngredientList } from '@/components/nutrition/IngredientList'
import { RecipeCards } from '@/components/nutrition/RecipeCards'
import { WeeklyPlanner } from '@/components/nutrition/WeeklyPlanner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { IngredientForm } from '@/components/nutrition/IngredientForm'
import { useState } from 'react'
import { addIngredient } from '@/lib/nutrition/calc'
import { useNutrition } from '@/lib/nutrition/store'
import { OnboardingMultiAdd } from '@/components/nutrition/OnboardingMultiAdd'

export default function PlansNutritionPage() {
  const { user } = useSelectedUser()
  const [dialogOpen, setDialogOpen] = useState(false)
  return (
    <NutritionProvider>
      <div className="p-6 grid gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Nutrition</h1>
            <div className="max-w-sm my-3"><UserSwitcher /></div>
            {user ? (
              <p className="text-muted-foreground">Using profile: <span className="font-medium">{user.name}</span></p>
            ) : (
              <p className="text-muted-foreground">Select a user in Users to personalize.</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <BulkAddButton />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add Ingredient</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Ingredient</DialogTitle>
                </DialogHeader>
                <AddIngredientInner onDone={() => setDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="macro-builder" className="w-full">
          <TabsList>
            <TabsTrigger value="macro-builder">Ingredients</TabsTrigger>
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
            <TabsTrigger value="planner">Weekly Planner</TabsTrigger>
          </TabsList>
          <TabsContent value="macro-builder" className="mt-3">
            <IngredientList />
          </TabsContent>
          <TabsContent value="recipes" className="mt-3">
            <RecipeCards />
          </TabsContent>
          <TabsContent value="planner" className="mt-3">
            <WeeklyPlanner />
          </TabsContent>
        </Tabs>
      </div>
    </NutritionProvider>
  )
}

function AddIngredientInner({ onDone }: { onDone: () => void }) {
  const { state, dispatch } = useNutrition()
  return (
    <IngredientForm onSubmit={async (v) => {
      const { ingredient } = addIngredient(
        { ...state } as any,
        {
          name: v.name,
          quantity: { amount: v.amount, unit: v.unit },
          pricePerUnit: v.pricePer100,
          nutrientsPer100: v.nutrients,
          packageSizeBase: v.packageSizeBase
        }
      )
      dispatch({ type: 'INGREDIENT_ADD', payload: ingredient })
      try {
        const { upsertFoodAndInventory } = await import('@/lib/nutrition/db')
        await upsertFoodAndInventory({
          name: v.name,
          unit: v.unit,
          amount: v.amount,
          pricePer100Base: v.pricePer100,
          nutrientsPer100: v.nutrients,
          packageSizeBase: v.packageSizeBase,
          category: undefined
        })
      } catch (e) {
        console.warn('Inventory sync failed; local state updated only', e)
      }
      onDone()
    }} />
  )
}

function BulkAddButton() {
  const { state, dispatch } = useNutrition()
  return (
    <OnboardingMultiAdd onParse={(rows) => {
      rows.forEach((r) => {
        try {
          const { ingredient } = addIngredient(
            { ...state } as any,
            {
              name: r.name,
              quantity: { amount: r.amount, unit: r.unit as any },
              pricePerUnit: 0,
              nutrientsPer100: { macros: { carbs: 0, fats: 0, protein: 0 }, micros: {} },
              packageSizeBase: undefined
            }
          )
          dispatch({ type: 'INGREDIENT_ADD', payload: ingredient })
        } catch {
          // ignore malformed row
        }
      })
    }} />
  )
}



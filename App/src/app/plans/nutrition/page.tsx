"use client"

import { useEffect } from 'react'
import { UserSwitcher } from '@/components/ui/user-switcher'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NutritionProvider } from '@/lib/nutrition/store'
import { IngredientList } from './IngredientList'
import { RecipeCards } from './RecipeCards'
// import removed: WeeklyPlanner was deleted

export default function PlansNutritionPage() {
  // Mark nutrition page as visited for onboarding progress
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasVisited = localStorage.getItem('fitspo:nutrition_page_visited')
      if (!hasVisited) {
        localStorage.setItem('fitspo:nutrition_page_visited', 'true')
        window.dispatchEvent(new CustomEvent('fitspo:nutrition_page_visited'))
      }
    }
  }, [])
  return (
    <NutritionProvider>
      <div className="p-6 grid gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Nutrition</h1>
          <div className="max-w-sm">
            <UserSwitcher />
          </div>
        </div>

        <Tabs defaultValue="macro-builder" className="w-full">
          <TabsList>
            <TabsTrigger value="macro-builder">Ingredients</TabsTrigger>
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
            {/* <TabsTrigger value="planner">Weekly Planner</TabsTrigger> */}
          </TabsList>
          <TabsContent value="macro-builder" className="mt-3">
            <IngredientList />
          </TabsContent>
          <TabsContent value="recipes" className="mt-3">
            <RecipeCards />
          </TabsContent>
          {/* <TabsContent value="planner" className="mt-3">
            <div className="text-sm text-muted-foreground">Weekly Planner has been removed.</div>
          </TabsContent> */}
        </Tabs>
      </div>
    </NutritionProvider>
  )
}
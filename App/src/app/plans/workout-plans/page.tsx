"use client"

import { CalendarView } from '@/app/plans/workout-plans/calendar-view'
import { NutritionProvider } from '@/lib/nutrition/store'

export default function WorkoutPlansPage() {
  return (
    <NutritionProvider>
      <div className="flex flex-col h-screen">
        <div className="flex-1 overflow-hidden">
          <CalendarView />
        </div>
      </div>
    </NutritionProvider>
  )
}



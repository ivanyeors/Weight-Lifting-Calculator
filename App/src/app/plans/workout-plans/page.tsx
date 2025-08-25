"use client"

import { CalendarView } from '@/components/workout-plans/calendar-view'

export default function WorkoutPlansPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-hidden">
        <CalendarView />
      </div>
    </div>
  )
}



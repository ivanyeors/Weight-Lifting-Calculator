"use client"

import { CalendarView, CalendarViewHeader } from '@/components/workout-plans/calendar-view'

export default function WorkoutPlansPage() {
  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Workout Calendar & Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage workout schedules, sessions, and participant information with our integrated calendar system.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <CalendarViewHeader />
        </div>
      </header>
      
      <div className="flex-1 overflow-hidden">
        <CalendarView />
      </div>
    </div>
  )
}



"use client"

import { CalendarView } from '@/components/workout-plans/calendar-view'

export default function WorkoutPlansPage() {
  return (
    <div className="p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workout Calendar & Management</h1>
          <p className="text-muted-foreground">
            Manage workout schedules, sessions, and participant information with our integrated calendar system.
          </p>
        </div>

        <CalendarView />
      </div>
    </div>
  )
}



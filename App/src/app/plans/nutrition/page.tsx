"use client"

import { useSelectedUser } from '@/hooks/use-selected-user'

export default function PlansNutritionPage() {
  const { user } = useSelectedUser()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Nutrition</h1>
      {user ? (
        <p className="text-muted-foreground">Using profile: <span className="font-medium">{user.name}</span></p>
      ) : (
        <p className="text-muted-foreground">Select a user in Users to personalize.</p>
      )}
    </div>
  )
}



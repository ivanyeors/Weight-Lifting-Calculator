"use client"

import { useSelectedUser } from '@/hooks/use-selected-user'
import { UserSwitcher } from '@/components/user-switcher'

export default function WorkoutPlansPage() {
  const { user } = useSelectedUser()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Workout Plans</h1>
      <div className="max-w-sm my-3"><UserSwitcher /></div>
      {user ? (
        <p className="text-muted-foreground">Using profile: <span className="font-medium">{user.name}</span></p>
      ) : (
        <p className="text-muted-foreground">Select a user in Users to personalize.</p>
      )}
    </div>
  )
}



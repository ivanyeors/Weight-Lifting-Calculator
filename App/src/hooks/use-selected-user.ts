"use client"

import { useState, useEffect, useCallback } from 'react'

interface User {
  id: string
  name: string
  email: string
  birth_date?: string
  height?: number
  weight?: number
  fitness_goal?: string
  activity_level?: string
  inputs?: Record<string, unknown>
}

interface UseSelectedUserReturn {
  user: User | null
  setUser: (user: User | null) => void
  loading: boolean
  error: string | null
}

export function useSelectedUser(): UseSelectedUserReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUser = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // For GitHub Pages, we can't use server-side data fetching
      // This would normally load user data from Supabase or localStorage
      const storedUser = typeof window !== 'undefined' 
        ? localStorage.getItem('selected-user')
        : null
      
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser) as User
        setUser(parsedUser)
      } else {
        // Mock user for demo purposes
        const mockUser: User = {
          id: 'demo-user',
          name: 'Demo User',
          email: 'demo@example.com',
          height: 175,
          weight: 70,
          fitness_goal: 'muscle_gain',
          activity_level: 'moderately_active'
        }
        setUser(mockUser)
      }
    } catch {
      setError('Failed to load user data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const handleSetUser = useCallback((newUser: User | null) => {
    setUser(newUser)
    if (newUser && typeof window !== 'undefined') {
      localStorage.setItem('selected-user', JSON.stringify(newUser))
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('selected-user')
    }
  }, [])

  return {
    user,
    setUser: handleSetUser,
    loading,
    error
  }
}



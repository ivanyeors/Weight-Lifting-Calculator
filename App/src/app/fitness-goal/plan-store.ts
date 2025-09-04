"use client"

import { useCallback, useEffect, useState } from 'react'
import type { Plan } from './plan-types'
import { syncService } from '@/lib/sync-service'

const STORAGE_KEY = 'fitspo:plans'

type StoredShape = Record<string /* userId */, Plan[]>

export function usePlans(userId: string | null) {
  const [plans, setPlans] = useState<Plan[]>([])

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
      const all: StoredShape = raw ? JSON.parse(raw) : {}
      setPlans(userId ? (all[userId] || []) : [])
    } catch {
      setPlans([])
    }
  }, [userId])

  // Sync this hook instance when plans are modified elsewhere
  useEffect(() => {
    if (typeof window === 'undefined') return
    const reload = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        const all: StoredShape = raw ? JSON.parse(raw) : {}
        setPlans(userId ? (all[userId] || []) : [])
      } catch {
        // keep current state on parse error
      }
    }
    window.addEventListener('fitspo:plans_changed', reload)
    // Also respond to cross-tab updates
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) reload()
    })
    return () => {
      window.removeEventListener('fitspo:plans_changed', reload)
    }
  }, [userId])

  const persist = useCallback((next: Plan[]) => {
    try {
      if (!userId) return
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
      const all: StoredShape = raw ? JSON.parse(raw) : {}
      all[userId] = next
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
      setPlans(next)
      try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('fitspo:plans_changed')) } catch {}
    } catch {
      setPlans(next)
    }
  }, [userId])

  const add = useCallback((plan: Plan) => {
    persist([plan, ...plans])
  }, [plans, persist])

  const remove = useCallback((id: string) => {
    persist(plans.filter(p => p.id !== id))
  }, [plans, persist])

  const update = useCallback((id: string, partial: Partial<Plan>) => {
    const updatedPlans = plans.map(p => p.id === id ? { ...p, ...partial } : p)
    persist(updatedPlans)

    // Sync active plan changes to database
    const updatedPlan = updatedPlans.find(p => p.id === id)
    if (updatedPlan && updatedPlan.status === 'active' && userId) {
      syncService.syncActivePlansToDb(userId).catch(console.error)
    }
  }, [plans, persist, userId])

  return { plans, add, remove, update }
}

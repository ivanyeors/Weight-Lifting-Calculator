"use client"

import { useCallback, useEffect, useState } from 'react'
import type { Plan } from './plan-types'

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
    persist(plans.map(p => p.id === id ? { ...p, ...partial } : p))
  }, [plans, persist])

  return { plans, add, remove, update }
}

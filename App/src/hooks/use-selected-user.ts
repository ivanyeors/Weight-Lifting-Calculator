"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { PersonalInputs, Gender, ExperienceCategory } from '@/lib/idealWeight'

export type SelectedManagedUser = {
  id: string
  name: string
  inputs: PersonalInputs
  injuries: string[] // muscle ids
  medicalConditions: string[]
  foodAllergies: string[]
  goals?: string
  note?: string
}

export function useSelectedUser() {
  const [user, setUser] = useState<SelectedManagedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const selectedId = typeof window !== 'undefined' ? localStorage.getItem('fitspo:selected_user_id') : null
      if (!selectedId) { setUser(null); return }
      const { data: mu, error: muErr } = await supabase
        .from('managed_users')
        .select('id, name, body_weight_kg, height_cm, age, skeletal_muscle_mass_kg, body_fat_mass_kg, gender, experience, medical_conditions, food_allergies, goals, note')
        .eq('id', selectedId)
        .maybeSingle()
      if (muErr || !mu) { setUser(null); return }
      const { data: inj } = await supabase
        .from('managed_user_injuries')
        .select('muscle_id')
        .eq('user_id', mu.id)
      const injuries = (inj ?? []).map((r: any) => r.muscle_id as string)
      const toGender = (g: any): Gender => (g === 'female' ? 'female' : 'male')
      const allowedExp = new Set(['cat1','cat2','cat3','cat4','cat5'])
      const toExp = (e: any): ExperienceCategory => (allowedExp.has(e) ? e : 'cat3') as ExperienceCategory
      const inputs: PersonalInputs = {
        bodyWeight: Number(mu.body_weight_kg ?? 70),
        height: Number(mu.height_cm ?? 175),
        age: Number(mu.age ?? 25),
        gender: toGender(mu.gender),
        experience: toExp(mu.experience),
        skeletalMuscleMass: Number(mu.skeletal_muscle_mass_kg ?? 30),
        bodyFatMass: Number(mu.body_fat_mass_kg ?? 20),
      }
      setUser({
        id: mu.id as string,
        name: (mu.name as string) || 'User',
        inputs,
        injuries,
        medicalConditions: Array.isArray(mu.medical_conditions) ? (mu.medical_conditions as string[]) : [],
        foodAllergies: Array.isArray(mu.food_allergies) ? (mu.food_allergies as string[]) : [],
        goals: (mu.goals as string | null) ?? undefined,
        note: (mu.note as string | null) ?? undefined,
      })
    } catch (e) {
      setError('Failed to load selected user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  // Cross-tab and same-tab selection sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'fitspo:selected_user_id') reload()
    }
    const onSameTab = () => reload()
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage)
      window.addEventListener('fitspo:selected_user_changed', onSameTab as EventListener)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage)
        window.removeEventListener('fitspo:selected_user_changed', onSameTab as EventListener)
      }
    }
  }, [reload])

  return { user, loading, error, reload }
}



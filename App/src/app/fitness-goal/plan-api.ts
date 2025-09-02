"use client"

import { supabase } from '@/lib/supabaseClient'
import type { Plan } from './plan-types'

export async function savePlan(plan: Plan) {
  const { id, userId, title, status, durationDays, pillars, config, createdAt } = plan
  const row = {
    id,
    user_id: userId,
    owner_id: (await supabase.auth.getUser()).data.user?.id || null,
    title,
    status,
    duration_days: durationDays ?? null,
    pillars,
    config,
    created_at: createdAt,
  }
  return await supabase.from('fitness_plans').upsert(row, { onConflict: 'id' })
}

export async function fetchPlans(userId: string) {
  const { data, error } = await supabase
    .from('fitness_plans')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data || []).map(r => ({
    id: r.id,
    userId: r.user_id,
    title: r.title,
    status: r.status,
    durationDays: r.duration_days ?? undefined,
    pillars: r.pillars || {},
    config: r.config || {},
    createdAt: r.created_at,
  })) as Plan[]
}

export async function deletePlan(userId: string, id: string) {
  const { error } = await supabase
    .from('fitness_plans')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

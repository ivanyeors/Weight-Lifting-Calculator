import { supabase } from '@/lib/supabaseClient'

export type Food = {
  id: string
  name: string
  category: string | null
  unit_kind: 'mass' | 'volume' | 'count'
  carbs_per_100: number
  fats_per_100: number
  protein_per_100: number
  micros: Record<string, number>
}

export async function fetchFoods(): Promise<Food[]> {
  const { data, error } = await supabase
    .from('foods')
    .select('id, name, category, unit_kind, carbs_per_100, fats_per_100, protein_per_100, micros')
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []) as Food[]
}

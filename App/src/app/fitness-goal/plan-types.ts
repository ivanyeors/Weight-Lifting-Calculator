export type PlanStatus = 'active' | 'paused' | 'completed' | 'draft'
export type PillarKey = 'food' | 'water' | 'sleep' | 'exercise'

export type Plan = {
  id: string
  userId: string
  title: string
  status: PlanStatus
  durationDays?: number
  pillars: Record<PillarKey, boolean>
  config: {
    food?: {
      targetWeightKg?: number
      macros?: { protein_g?: number; carbs_g?: number; fat_g?: number }
    }
    water?: {
      reminders?: string[]
      recommendedLitersPerDay?: number
    }
    sleep?: {
      startTime?: string
      endTime?: string
    }
    exercise?: {
      physique?: string
      templateId?: string | null
      estimatedKcalsPerWorkout?: number
    }
  }
  createdAt: string
}

export type PlanScore = {
  food: number
  water: number
  sleep: number
  exercise: number
}

export const defaultWeights = { food: 30, water: 10, sleep: 30, exercise: 30 } as const

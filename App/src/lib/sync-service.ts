"use client"

import { supabase } from './supabaseClient'
import type { Plan } from '@/app/fitness-goal/plan-types'

// Sync service for bidirectional data synchronization between fitness-goal and workout-plans
export class SyncService {
  private static instance: SyncService
  private syncListeners: Map<string, Set<() => void>> = new Map()

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService()
    }
    return SyncService.instance
  }

  // Event system for real-time sync
  on(event: string, callback: () => void) {
    if (!this.syncListeners.has(event)) {
      this.syncListeners.set(event, new Set())
    }
    this.syncListeners.get(event)!.add(callback)
  }

  off(event: string, callback: () => void) {
    this.syncListeners.get(event)?.delete(callback)
  }

  emit(event: string) {
    this.syncListeners.get(event)?.forEach(callback => callback())
  }

  // Sync fitness logs from localStorage to Supabase
  async syncFitnessLogsToDb(planId: string, userId: string) {
    try {
      // Guard: Supabase auth user must exist (RLS policies depend on auth.uid())
      const { data: authData } = await supabase.auth.getUser()
      const authUserId = authData?.user?.id
      if (!authUserId) {
        // Skip sync silently when unauthenticated; caller may retry after login
        return false
      }

      // Ensure planId is a UUID; if it is not, attempt to upsert plan with a new UUID and migrate
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(planId)) {
        // Attempt migration: read local plan and assign a new UUID, then update local storage
        try {
          const plansRaw = localStorage.getItem('fitspo:plans')
          if (plansRaw) {
            const allPlans = JSON.parse(plansRaw) as Record<string, Array<Plan>>
            const userPlans = allPlans[userId] || []
            const idx = userPlans.findIndex((p) => p.id === planId)
            if (idx >= 0) {
              const newId = (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
              const migrated: Plan = { ...userPlans[idx], id: newId }
              userPlans[idx] = migrated
              allPlans[userId] = userPlans
              localStorage.setItem('fitspo:plans', JSON.stringify(allPlans))
              planId = newId
            }
          }
        } catch {
          // Ignore migration errors, proceed with original id (DB may reject)
        }
      }

      const day = new Date().toISOString().slice(0, 10)

      // Collect all logs for today
      const logs = {
        food: this.getLocalStorageValue('fitspo:food_kcals_by_day', day),
        water: this.getLocalStorageValue('fitspo:water_liters_by_day', day),
        sleep: this.getLocalStorageValue('fitspo:sleep_hours_by_day', day),
        exercise: this.getLocalStorageValue('fitspo:exercise_kcals_by_day', day)
      }

      // Ensure plan exists in DB (FK constraint). If not, upsert from local storage copy
      try {
        const { data: planRow, error: planFetchError } = await supabase
          .from('fitness_plans')
          .select('id')
          .eq('id', planId)
          .maybeSingle()
        if (planFetchError || !planRow) {
          // Try find in local storage and upsert
          const plansRaw = localStorage.getItem('fitspo:plans')
          if (plansRaw) {
            const allPlans = JSON.parse(plansRaw) as Record<string, Array<Plan>>
            const userPlans = allPlans[userId] || []
            const localPlan = userPlans.find((p) => p.id === planId)
            if (localPlan) {
              await supabase
                .from('fitness_plans')
                .upsert({
                  id: localPlan.id,
                  user_id: localPlan.userId,
                  owner_id: authUserId,
                  title: localPlan.title,
                  status: localPlan.status,
                  duration_days: localPlan.durationDays,
                  pillars: localPlan.pillars,
                  config: localPlan.config,
                  created_at: localPlan.createdAt,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'id'
                })
            }
          }
        }
      } catch {
        // ignore and proceed; insert below may still succeed if plan exists
      }

      // Upsert to fitness_logs table
      const { error } = await supabase
        .from('fitness_logs')
        .upsert({
          plan_id: planId,
          user_id: userId,
          date: day,
          food_kcals: logs.food,
          water_liters: logs.water,
          sleep_hours: logs.sleep,
          exercise_kcals: logs.exercise,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'plan_id,date'
        })

      if (error) throw error

      this.emit('fitness-logs-synced')
      return true
    } catch (error) {
      console.error('Failed to sync fitness logs:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        planId,
        userId,
        error
      })
      return false
    }
  }

  // Sync completed workout session to fitness exercise logs
  async syncWorkoutCompletionToFitness(planId: string, userId: string, sessionData: {
    calories: number
    date: string
    templateId?: string
  }) {
    try {
      // Update localStorage
      const exerciseMap = this.getLocalStorageMap('fitspo:exercise_kcals_by_day') as Record<string, number>
      exerciseMap[sessionData.date] = (exerciseMap[sessionData.date] || 0) + sessionData.calories
      localStorage.setItem('fitspo:exercise_kcals_by_day', JSON.stringify(exerciseMap))

      // Update plan logs
      const planLogsKey = `fitspo:plan_logs:${planId}`
      const planLogs = this.getLocalStorageMap(planLogsKey) as Record<string, { exercise?: number; date?: string }>
      const existing = planLogs[sessionData.date] || {}
      planLogs[sessionData.date] = {
        ...existing,
        exercise: ((existing as { exercise?: number }).exercise || 0) + sessionData.calories,
        date: sessionData.date
      }
      localStorage.setItem(planLogsKey, JSON.stringify(planLogs))

      // Sync to database
      await this.syncFitnessLogsToDb(planId, userId)

      // Emit sync event
      this.emit('workout-completion-synced')
      window.dispatchEvent(new Event('fitspo:logs_changed'))

      return true
    } catch (error) {
      console.error('Failed to sync workout completion:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        planId,
        userId,
        error
      })
      return false
    }
  }

  // Create calendar events for fitness plan reminders (water/sleep)
  async createFitnessRemindersInCalendar(plan: Plan, userId: string) {
    try {
      if (plan.status !== 'active') return

      const today = new Date()
      const events = []

      // Water reminders
      if (plan.pillars.water && plan.config.water?.reminders) {
        for (const reminder of plan.config.water.reminders) {
          const [hours, minutes] = reminder.split(':').map(Number)
          const reminderTime = new Date(today)
          reminderTime.setHours(hours, minutes, 0, 0)

          events.push({
            title: '💧 Drink Water Reminder',
            start: reminderTime.toISOString(),
            end: new Date(reminderTime.getTime() + 15 * 60 * 1000).toISOString(), // 15 min duration
            description: `Water reminder for fitness plan: ${plan.title}`,
            backgroundColor: '#3b82f6',
            borderColor: '#2563eb',
            extendedProps: {
              kind: 'water',
              status: 'pending',
              plan: plan.title,
              location: 'Daily Reminder'
            },
            source: 'platform'
          })
        }
      }

      // Sleep schedule
      if (plan.pillars.sleep && plan.config.sleep?.startTime && plan.config.sleep?.endTime) {
        const [startH, startM] = plan.config.sleep.startTime.split(':').map(Number)
        const [endH, endM] = plan.config.sleep.endTime.split(':').map(Number)

        const sleepStart = new Date(today)
        sleepStart.setHours(startH, startM, 0, 0)

        const sleepEnd = new Date(today)
        sleepEnd.setHours(endH, endM, 0, 0)

        // If end time is next day
        if (endH < startH || (endH === startH && endM < startM)) {
          sleepEnd.setDate(sleepEnd.getDate() + 1)
        }

        events.push({
          title: '😴 Sleep Schedule',
          start: sleepStart.toISOString(),
          end: sleepEnd.toISOString(),
          description: `Sleep schedule for fitness plan: ${plan.title}`,
          backgroundColor: '#8b5cf6',
          borderColor: '#7c3aed',
          extendedProps: {
            kind: 'sleep',
            status: 'pending',
            plan: plan.title,
            location: 'Bedroom'
          },
          source: 'platform'
        })
      }

      // Create events in database
      for (const event of events) {
        await supabase
          .from('workout_sessions')
          .insert({
            owner_id: userId,
            title: event.title,
            start_at: event.start,
            end_at: event.end,
            description: event.description,
            background_color: event.backgroundColor,
            border_color: event.borderColor,
            location: event.extendedProps.location
          })
      }

      this.emit('fitness-reminders-created')
      return true
    } catch (error) {
      console.error('Failed to create fitness reminders:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        planId: plan.id,
        userId,
        error
      })
      return false
    }
  }

  // Sync active plans from localStorage to Supabase
  async syncActivePlansToDb(userId: string) {
    try {
      const plansRaw = localStorage.getItem('fitspo:plans')
      if (!plansRaw) return

      const allPlans: Record<string, Plan[]> = JSON.parse(plansRaw)
      const userPlans = allPlans[userId] || []

      for (const plan of userPlans) {
        if (plan.status === 'active') {
          await supabase
            .from('fitness_plans')
            .upsert({
              id: plan.id,
              user_id: userId,
              owner_id: (await supabase.auth.getUser()).data.user?.id,
              title: plan.title,
              status: plan.status,
              duration_days: plan.durationDays,
              pillars: plan.pillars,
              config: plan.config,
              created_at: plan.createdAt,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            })

          // Sync today's logs for active plans
          await this.syncFitnessLogsToDb(plan.id, userId)
        }
      }

      this.emit('active-plans-synced')
      return true
    } catch (error) {
      console.error('Failed to sync active plans:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        error
      })
      return false
    }
  }

  // Get active plans from database
  async getActivePlansFromDb(userId: string): Promise<Plan[]> {
    try {
      const { data, error } = await supabase
        .from('fitness_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')

      if (error) throw error

      return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        status: row.status,
        durationDays: row.duration_days,
        pillars: row.pillars,
        config: row.config,
        createdAt: row.created_at
      }))
    } catch (error) {
      console.error('Failed to get active plans from DB:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        error
      })
      return []
    }
  }

  // Sync workout sessions completion to fitness logs
  async syncCompletedWorkoutsToFitness(userId: string) {
    try {
      const { data: sessions, error } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          workout_templates (
            estimated_calories
          )
        `)
        .eq('owner_id', userId)
        .gte('start_at', new Date().toISOString().split('T')[0]) // Today and future
        .order('start_at', { ascending: false })

      if (error) throw error

      // Get active plans
      const activePlans = await this.getActivePlansFromDb(userId)

      for (const session of sessions || []) {
        const sessionDate = session.start_at.split('T')[0]
        const calories = session.workout_templates?.estimated_calories || 300

        // Update fitness logs for each active plan that has exercise pillar
        for (const plan of activePlans) {
          if (plan.pillars.exercise) {
            await this.syncWorkoutCompletionToFitness(plan.id, userId, {
              calories,
              date: sessionDate,
              templateId: session.workout_template_id
            })
          }
        }
      }

      return true
    } catch (error) {
      console.error('Failed to sync completed workouts:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        error
      })
      return false
    }
  }

  // Utility methods
  private getLocalStorageValue(key: string, date: string): number | null {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const map = JSON.parse(raw) as Record<string, number>
      return map[date] || null
    } catch {
      return null
    }
  }

  private getLocalStorageMap(key: string): Record<string, unknown> {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }
}

// Global sync service instance
export const syncService = SyncService.getInstance()

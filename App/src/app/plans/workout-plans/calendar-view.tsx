"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Calendar as CalendarIcon, Filter, ChefHat, Minus, Moon, Trash2 } from 'lucide-react'

// Schedule-X imports
import { useCalendarApp, ScheduleXCalendar } from '@schedule-x/react'
import {
  createViewDay,
  createViewMonthAgenda,
  createViewMonthGrid,
  createViewWeek,
} from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop'
import { createResizePlugin } from '@schedule-x/resize'

import '@schedule-x/theme-shadcn/dist/index.css'
import { Card } from '@/components/ui/card'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer'
import { useIsMobile } from '@/hooks/use-mobile'
import { createRoot } from 'react-dom/client'

import { CalendarEventDrawer } from './calendar-event-drawer'
import { CalendarSidebar } from './calendar-sidebar'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { supabase } from '@/lib/supabaseClient'
import { syncService } from '@/lib/sync-service'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { HEALTHY_RECIPES } from '@/lib/nutrition/recipes'
import { calculateRecipeForPax, feasibilityForRecipe } from '@/lib/nutrition/calc'
// import { convertToBase, formatQuantityBase } from '@/lib/nutrition/convert'
import type { Food } from '@/lib/nutrition/foods'
import type { Ingredient } from '@/lib/nutrition/types'
import { fetchFoods } from '@/lib/nutrition/foods'
import { fetchUserInventory } from '@/lib/nutrition/db'

interface User {
  id: string
  name: string
  email: string
  status: 'active' | 'cancelled' | 'postponed' | 'completed'
  medicalConditions: string[]
  lastAttendance: string
  trainer: string
  phone: string
  avatar?: string
}

interface Trainer {
  id: string
  name: string
  email: string
  phone: string
  specialties: string[]
  rating: number
  availability: string[]
  avatar?: string
}

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  description?: string
  backgroundColor: string
  borderColor: string
  source?: 'platform' | 'google' // Track event source
  googleEventId?: string // Google Calendar event ID
  accountId?: string // Google Calendar account ID
  accountEmail?: string // Google Calendar account email
  // Selected workout space (DB foreign key)
  workoutSpaceId?: string
  // For platform events, maintain per-account Google event linkage
  syncedGoogleEventIds?: Record<string, string>
  // Target Google account IDs selected for syncing
  targetAccountIds?: string[]
  extendedProps: {
    trainer: string
    participants: User[]
    plan: string
    location: string
    maxParticipants: number
    currentParticipants: number
    medicalFlags: string[]
    attendance: Record<string, 'present' | 'absent' | 'late' | 'cancelled'>
    // Optional: associated workout template card metadata
    workoutTemplate?: {
      id: string
      name: string
      exerciseCount: number
      estimatedCalories: number
      estimatedTime: number
      usageCount: number
      workoutSpace?: string
    }
    // Plan-derived event kind and status (water/sleep)
    kind?: 'water' | 'sleep' | 'workout'
    status?: 'pending' | 'complete' | 'missed'
  }
}

export function CalendarView({
  daySelection,
  hideSidebar = false,
  hideHeader = false
}: {
  daySelection?: { enabled?: boolean; selectedDays: string[]; onToggleDay: (day: string) => void }
  hideSidebar?: boolean
  hideHeader?: boolean
} = {}) {
  // Google Calendar integration
  const {
    isAuthenticated: isGoogleCalendarConnected,
    isLoading: isGoogleCalendarLoading,
    error: googleCalendarError,
    events: googleCalendarEvents,
    accounts: googleCalendarAccounts,
    convertFromGoogleEvent,
    convertToGoogleEvent,
    fetchEvents,
    createEvent: createGoogleEvent,
    updateEvent: updateGoogleEvent,
    deleteEvent: deleteGoogleEvent
  } = useGoogleCalendar({ autoSync: true })

  // Per-account visibility toggles
  const [visibleAccounts, setVisibleAccounts] = useState<Record<string, boolean>>({})

  // Initialize and sync visibility with accounts
  useEffect(() => {
    if (googleCalendarAccounts.length === 0) {
      setVisibleAccounts({})
      return
    }
    setVisibleAccounts(prev => {
      const next: Record<string, boolean> = {}
      for (const acc of googleCalendarAccounts) {
        next[acc.id] = typeof prev[acc.id] === 'boolean' ? prev[acc.id] : true
      }
      return next
    })
  }, [googleCalendarAccounts])

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([])
  const [showWater, setShowWater] = useState(true)
  const [showSleep, setShowSleep] = useState(true)

  const [trainers] = useState<Trainer[]>([
    {
      id: '1',
      name: 'Sarah Wilson',
      email: 'sarah@fitness.com',
      phone: '+1-555-0101',
      specialties: ['Strength Training', 'Cardio', 'HIIT'],
      rating: 4.8,
      availability: ['Monday', 'Wednesday', 'Friday'],
      avatar: '/avatars/sarah.jpg'
    },
    {
      id: '2',
      name: 'Mike Johnson',
      email: 'mike@fitness.com',
      phone: '+1-555-0102',
      specialties: ['Yoga', 'Pilates', 'Flexibility'],
      rating: 4.6,
      availability: ['Tuesday', 'Thursday', 'Saturday'],
      avatar: '/avatars/mike.jpg'
    }
  ])

  const [workoutSpaces, setWorkoutSpaces] = useState<{ id: string; name: string }[]>([])


  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    // Default to collapsed on mobile/tablet
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024 // lg breakpoint
    }
    return hideSidebar
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'view' | 'create' | 'edit'>('view')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [prefillDates, setPrefillDates] = useState<{ start: string; end: string } | null>(null)
  const previewEventIdRef = useRef<string | null>(null)
  const isMobile = useIsMobile()

  // Nutrition drawer state
  const [nutritionDrawerOpen, setNutritionDrawerOpen] = useState(false)
  const [nutritionDrawerDate, setNutritionDrawerDate] = useState<string | null>(null)
  // Version bump to force re-render of Meals when logs change
  const [nutritionVersion, setNutritionVersion] = useState(0)
  // Foods + inventory for rendering recipe cards
  const [foodsForMeals, setFoodsForMeals] = useState<Food[]>([])
  const [remoteInvForMeals, setRemoteInvForMeals] = useState<Record<string, number>>({})

  useEffect(() => {
    let active = true
    fetchFoods().then((f) => { if (active) setFoodsForMeals(f) }).catch(() => setFoodsForMeals([]))
    const loadInv = async () => {
      try {
        const inv = await fetchUserInventory()
        if (active) {
          const amounts = Object.fromEntries(Object.entries(inv || {}).map(([k, v]) => [k, (v as { amount?: number }).amount || 0])) as Record<string, number>
          setRemoteInvForMeals(amounts)
        }
      } catch { /* ignore */ }
    }
    void loadInv()
    const onInv = () => { void loadInv() }
    try { if (typeof window !== 'undefined') window.addEventListener('fitspo:inventory_changed', onInv) } catch { /* ignore */ }
    return () => { active = false; try { if (typeof window !== 'undefined') window.removeEventListener('fitspo:inventory_changed', onInv) } catch { /* ignore */ } }
  }, [])
  // Sleep drawer state
  const [sleepDrawerOpen, setSleepDrawerOpen] = useState(false)
  const [sleepDrawerDate, setSleepDrawerDate] = useState<string | null>(null)
  const [sleepStartInput, setSleepStartInput] = useState<string>('23:00')
  const [sleepEndInput, setSleepEndInput] = useState<string>('07:00')
  const [waterLogsDbByDay, setWaterLogsDbByDay] = useState<Record<string, Array<{ id: string; start: string; end: string; status: 'complete' | 'missed'; at: string }>>>({})

  // All times are handled as local strings: 'yyyy-MM-dd HH:mm'
  
  // Resolve which Google account to sync to based on selected trainer
  const resolveTargetAccountId = useCallback((ev: CalendarEvent): string | null => {
    try {
      const trainerName = ev?.extendedProps?.trainer
      if (!trainerName) return null
      const trainer = trainers.find(t => t.name === trainerName)
      if (!trainer) return null
      const account = googleCalendarAccounts.find(a => a.email === trainer.email)
      return account?.id || null
    } catch {
      return null
    }
  }, [trainers, googleCalendarAccounts])
  
  // Removed prefill dates - will implement later

  // Removed preview state - using drag-to-create instead

  // Fetch workout spaces when component mounts
  useEffect(() => {
    const loadWorkoutSpaces = async () => {
      try {
        const { data, error } = await supabase
          .from('workout_spaces')
          .select('id, name')
          .order('name', { ascending: true })
        if (error) throw error
        setWorkoutSpaces((data ?? []).map((r: { id: string; name: string }) => ({ 
          id: r.id, 
          name: r.name 
        })))
      } catch (err) {
        console.error('Failed to load workout spaces', err)
      }
    }
    loadWorkoutSpaces()
  }, [])

  // Helpers to convert between local 'yyyy-MM-dd HH:mm' and ISO strings for DB
  const toIsoFromLocal = useCallback((local: string): string => {
    try {
      // local like '2025-01-31 09:00'
      const [datePart, timePart] = local.split(' ')
      const [year, month, day] = datePart.split('-').map(Number)
      const [hour, minute] = timePart.split(':').map(Number)
      const d = new Date()
      d.setFullYear(year)
      d.setMonth(month - 1)
      d.setDate(day)
      d.setHours(hour, minute, 0, 0)
      return d.toISOString()
    } catch {
      return new Date(local).toISOString()
    }
  }, [])

  const toLocalFromIso = useCallback((iso: string): string => {
    try {
      const d = new Date(iso)
      const pad = (n: number) => String(n).padStart(2, '0')
      const yyyy = d.getFullYear()
      const mm = pad(d.getMonth() + 1)
      const dd = pad(d.getDate())
      const hh = pad(d.getHours())
      const min = pad(d.getMinutes())
      return `${yyyy}-${mm}-${dd} ${hh}:${min}`
    } catch {
      return iso
    }
  }, [])

  // Load existing platform sessions from Supabase (with participants)
  useEffect(() => {
    const loadSessions = async () => {
      try {
        type DbSession = {
          id: string
          title: string
          start_at: string
          end_at: string
          description?: string | null
          location?: string | null
          background_color?: string | null
          border_color?: string | null
          workout_template_id?: string | null
          workout_space_id?: string | null
          google_linked?: Record<string, string> | null
        }

        const { data: sessions, error } = await supabase
          .from('workout_sessions')
          .select('*')
          .order('start_at', { ascending: true })
        if (error) throw error

        const sessionIds = (sessions ?? ([] as DbSession[])).map((s) => s.id)
        let participantsRows: Array<{ session_id: string; user_id: string; attendance: string | null }> = []
        if (sessionIds.length > 0) {
          const { data: prs, error: perr } = await supabase
            .from('workout_session_participants')
            .select('session_id, user_id, attendance')
            .in('session_id', sessionIds)
          if (perr) throw perr
          participantsRows = (prs ?? []) as typeof participantsRows
        }

        // Load workout templates metadata for referenced sessions
        const templateIds = Array.from(new Set(((sessions ?? []) as DbSession[])
          .map(s => s.workout_template_id)
          .filter((v): v is string => !!v)))

        const templatesMap: Record<string, {
          id: string
          name: string
          exercisesCount: number
          estimatedCalories?: number | null
          estimatedTime?: number | null
          usageCount?: number | null
        }> = {}

        if (templateIds.length > 0) {
          const { data: tpls, error: tErr } = await supabase
            .from('workout_templates')
            .select('id, name, exercises, estimated_calories, estimated_time, usage_count')
            .in('id', templateIds)
          if (tErr) throw tErr
          for (const t of (tpls ?? []) as Array<{ id: string; name: string; exercises?: unknown; estimated_calories?: number | null; estimated_time?: number | null; usage_count?: number | null }>) {
            const exercisesArray = Array.isArray(t.exercises) ? (t.exercises as unknown[]) : []
            templatesMap[t.id] = {
              id: t.id,
              name: t.name,
              exercisesCount: exercisesArray.length,
              estimatedCalories: t.estimated_calories ?? null,
              estimatedTime: t.estimated_time ?? null,
              usageCount: t.usage_count ?? null
            }
          }
        }

        // Build CalendarEvent[] from DB
        const bySession: Record<string, Array<{ user_id: string; attendance: string | null }>> = {}
        participantsRows.forEach(r => {
          if (!bySession[r.session_id]) bySession[r.session_id] = []
          bySession[r.session_id].push({ user_id: r.user_id, attendance: r.attendance })
        })

        // Load user details for participants
        const allUserIds = Array.from(new Set(participantsRows.map(r => r.user_id)))
        const usersMap: Record<string, { id: string; name: string; email?: string | null; medical_conditions?: string[] | null }> = {}
        if (allUserIds.length > 0) {
          const { data: usersData } = await supabase
            .from('managed_users')
            .select('id, name, medical_conditions, note')
            .in('id', allUserIds)
          for (const u of (usersData ?? []) as Array<{ id: string; name: string; medical_conditions?: string[] | null }>) {
            usersMap[u.id] = { id: u.id, name: u.name, email: null, medical_conditions: u.medical_conditions }
          }
        }

        const platformFromDb: CalendarEvent[] = (sessions ?? []).map((s: DbSession) => {
          const users = (bySession[s.id] || []).map(row => {
            const u = usersMap[row.user_id]
            return {
              id: row.user_id,
              name: u?.name || 'User',
              email: u?.email || '',
              status: 'active' as const,
              medicalConditions: (u?.medical_conditions ?? []) as string[],
              lastAttendance: '',
              trainer: 'Unassigned',
              phone: ''
            }
          })
          const tpl = s.workout_template_id ? templatesMap[s.workout_template_id] : undefined
          const linked = (s.google_linked || {}) as Record<string, string>
          return {
            id: s.id,
            title: s.title,
            start: toLocalFromIso(s.start_at),
            end: toLocalFromIso(s.end_at),
            description: s.description || '',
            backgroundColor: s.background_color || '#3b82f6',
            borderColor: s.border_color || '#1e40af',
            source: 'platform' as const,
            workoutSpaceId: s.workout_space_id || undefined,
            syncedGoogleEventIds: linked,
            extendedProps: {
              trainer: 'Unassigned',
              participants: users as unknown as User[],
              plan: tpl?.name || s.title,
              location: s.location || '',
              maxParticipants: users.length,
              currentParticipants: users.length,
              medicalFlags: [],
              attendance: {},
              workoutTemplate: tpl ? {
                id: tpl.id,
                name: tpl.name,
                exerciseCount: tpl.exercisesCount,
                estimatedCalories: (tpl.estimatedCalories ?? 0),
                estimatedTime: (tpl.estimatedTime ?? 0),
                usageCount: (tpl.usageCount ?? 0)
              } : undefined
            }
          } as CalendarEvent
        })

        setEvents(prev => {
          // Keep any Google events already in memory
          const googleOnly = prev.filter(e => e.source === 'google')
          // Preserve plan-derived platform events (e.g., water/sleep)
          const nonSessionPlatform = prev.filter(e => (
            e.source === 'platform' && (
              e?.extendedProps?.kind === 'water' || e?.extendedProps?.kind === 'sleep'
            )
          ))
          // Merge uniquely by id to avoid duplicates
          const byId = new Map<string, typeof prev[number]>()
          for (const ev of [...platformFromDb, ...nonSessionPlatform, ...googleOnly]) {
            if (!byId.has(ev.id)) byId.set(ev.id, ev)
          }
          return Array.from(byId.values())
        })
      } catch (e) {
        console.error('Failed to load sessions from DB', e)
      }
    }
    loadSessions()
  }, [toLocalFromIso])

  // Fetch Google Calendar events when component mounts or connection state changes
  useEffect(() => {
    if (isGoogleCalendarConnected) {
      fetchEvents()
    }
  }, [isGoogleCalendarConnected, fetchEvents])

  // Inject plan-derived water/sleep events for next 7 days
  useEffect(() => {
    const loadPlanDerived = () => {
      try {
        const userId = typeof window !== 'undefined' ? (localStorage.getItem('fitspo:selected_user_id') || '') : ''
        if (!userId) return
        const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:plans') : null
        if (!raw) return
        type PlanConfig = { water?: { reminders?: string[] }; sleep?: { startTime?: string; endTime?: string } }
        type StoredPlans = Record<string, Array<{ id: string; userId: string; pillars: Record<string, boolean>; config?: PlanConfig }>>
        const all = JSON.parse(raw) as StoredPlans
        const plans = all[userId] || []
        const active = plans[0] || null
        if (!active) return
        const now = new Date()
        const days = 7
        const next: CalendarEvent[] = []
        // Water reminders: default times 09:00, 12:00, 15:00, 18:00 if enabled
        if (active.pillars?.water) {
          const times: string[] = (active.config?.water?.reminders && active.config.water.reminders.length > 0)
            ? active.config.water.reminders
            : ['09:00', '12:00', '15:00', '18:00']
          const waterTarget = (isGoogleCalendarConnected && googleCalendarAccounts[0]?.id) ? googleCalendarAccounts[0].id : null
          // Load any locally persisted per-day water statuses to reflect in injected events
          let statusStore: Record<string, Record<string, 'pending'|'complete'|'missed'>> = {}
          try {
            const rawStatus = typeof window !== 'undefined' ? localStorage.getItem('fitspo:water_status_by_day') : null
            statusStore = rawStatus ? JSON.parse(rawStatus) as typeof statusStore : {}
          } catch { /* ignore */ }
          for (let d = 0; d < days; d++) {
            const date = new Date(now)
            date.setDate(now.getDate() + d)
            const yyyy = date.getFullYear()
            const mm = String(date.getMonth() + 1).padStart(2, '0')
            const dd = String(date.getDate()).padStart(2, '0')
            for (const t of times) {
              const [hh, min] = t.split(':')
              const start = `${yyyy}-${mm}-${dd} ${hh}:${min}`
              const end = `${yyyy}-${mm}-${dd} ${hh}:${String(Number(min) + 30).padStart(2, '0')}`
              const tSafe = t.replace(/[^A-Za-z0-9_-]/g, '')
              const dayKey = `${yyyy}-${mm}-${dd}`
              const perDay = statusStore[dayKey] || {}
              const evId = `water-${yyyy}${mm}${dd}-${tSafe}`
              const persistedStatus = perDay[evId] as 'pending'|'complete'|'missed' | undefined
              next.push({
                id: evId,
                title: 'Drink water',
                start,
                end,
                backgroundColor: 'rgba(59, 130, 246, 0.10)',
                borderColor: 'rgba(59, 130, 246, 0.20)',
                source: 'platform',
                targetAccountIds: waterTarget ? [waterTarget] : [],
                syncedGoogleEventIds: {},
                extendedProps: {
                  trainer: 'System',
                  participants: [],
                  plan: 'Hydration',
                  location: '',
                  maxParticipants: 0,
                  currentParticipants: 0,
                  medicalFlags: [],
                  attendance: {},
                  kind: 'water',
                  status: persistedStatus || 'pending'
                }
              })
            }
          }
        }
        // Sleep blocks: 23:00-07:00 default if enabled
        if (active.pillars?.sleep) {
          const startT = active.config?.sleep?.startTime || '23:00'
          const endT = active.config?.sleep?.endTime || '07:00'
          // Load any locally persisted per-day sleep statuses to reflect in injected events
          let sleepStatusStore: Record<string, 'pending'|'complete'|'missed'> = {}
          try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:sleep_status_by_day') : null
            sleepStatusStore = raw ? JSON.parse(raw) as typeof sleepStatusStore : {}
          } catch { /* ignore */ }
          for (let d = 0; d < days; d++) {
            const date = new Date(now)
            date.setDate(now.getDate() + d)
            const yyyy = date.getFullYear()
            const mm = String(date.getMonth() + 1).padStart(2, '0')
            const dd = String(date.getDate()).padStart(2, '0')
            const [sh, sm] = startT.split(':')
            const [eh, em] = endT.split(':')
            const start = `${yyyy}-${mm}-${dd} ${sh}:${sm}`
            const endDate = new Date(date)
            endDate.setDate(date.getDate() + (Number(eh) < Number(sh) ? 1 : 0))
            const yyyy2 = endDate.getFullYear()
            const mm2 = String(endDate.getMonth() + 1).padStart(2, '0')
            const dd2 = String(endDate.getDate()).padStart(2, '0')
            const end = `${yyyy2}-${mm2}-${dd2} ${eh}:${em}`
            const dayKey = `${yyyy}-${mm}-${dd}`
            const persistedStatus = sleepStatusStore[dayKey]
            next.push({
              id: `sleep-${yyyy}${mm}${dd}`,
              title: 'Sleep',
              start,
              end,
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              borderColor: 'rgba(139, 92, 246, 0.25)',
              source: 'platform',
              extendedProps: {
                trainer: 'System',
                participants: [],
                plan: 'Sleep',
                location: '',
                maxParticipants: 0,
                currentParticipants: 0,
                medicalFlags: [],
                attendance: {},
                kind: 'sleep',
                status: persistedStatus || 'pending'
              }
            })
          }
        }
        setEvents(prev => {
          const keep = prev.filter(e => e.extendedProps?.kind !== 'water' && e.extendedProps?.kind !== 'sleep')
          return [...keep, ...next]
        })
      } catch {
        // noop
      }
    }
    loadPlanDerived()
    const onChange = () => loadPlanDerived()
    if (typeof window !== 'undefined') {
      window.addEventListener('fitspo:plans_changed', onChange)
      return () => window.removeEventListener('fitspo:plans_changed', onChange)
    }
  }, [isGoogleCalendarConnected, googleCalendarAccounts])

  useEffect(() => {
    const loadHydrationLogs = async () => {
      try {
        if (!nutritionDrawerOpen || !nutritionDrawerDate) return
        const userId = typeof window !== 'undefined' ? (localStorage.getItem('fitspo:selected_user_id') || '') : ''
        if (!userId) return
        const { data, error } = await supabase
          .from('hydration_logs')
          .select('event_id, start_at, end_at, status, logged_at, day')
          .eq('user_id', userId)
          .eq('day', nutritionDrawerDate)
          .order('logged_at', { ascending: true })
        if (error) throw error
        const list = (data ?? []).map((r: { event_id: string; start_at: string; end_at: string; status: 'complete' | 'missed'; logged_at: string }) => ({
          id: r.event_id,
          start: toLocalFromIso(r.start_at),
          end: toLocalFromIso(r.end_at),
          status: r.status,
          at: r.logged_at
        }))
        setWaterLogsDbByDay(prev => ({ ...prev, [nutritionDrawerDate]: list }))
      } catch {
        // ignore if table missing or error
      }
    }
    void loadHydrationLogs()
  }, [nutritionDrawerOpen, nutritionDrawerDate, toLocalFromIso])

  // Sync Google Calendar events when they change
  useEffect(() => {
    console.log('Google Calendar state:', {
      isConnected: isGoogleCalendarConnected,
      eventsCount: googleCalendarEvents.length,
      accountsCount: googleCalendarAccounts.length,
      events: googleCalendarEvents
    })
    
    if (isGoogleCalendarConnected && googleCalendarEvents.length > 0) {
      console.log('Processing Google Calendar events...')

      // Build two collections:
      // - platformGroups: platform (canonical) events reconstructed from Google mirrors
      // - externalGoogleEvents: Google-only events not originated from platform
      const platformGroups = new Map<string, { base: CalendarEvent; linked: Record<string, string> }>()
      const externalGoogleEvents: CalendarEvent[] = []

      const rgba10 = (hexColor: string): string => {
        const m = hexColor?.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)
        if (!m) return 'rgba(107,114,128,0.1)'
        const r = Number.parseInt(m[1], 16)
        const g = Number.parseInt(m[2], 16)
        const b = Number.parseInt(m[3], 16)
        return `rgba(${r}, ${g}, ${b}, 0.1)`
      }

      for (const googleEvent of googleCalendarEvents) {
        console.log('Processing event:', googleEvent)
        const converted = convertFromGoogleEvent(googleEvent) as {
          platformEventId?: string
          title: string
          start: string
          end: string
          location?: string
          attendees?: Array<{ email: string; name: string }>
          accountId?: string
          accountEmail?: string
        }
        console.log('Converted event:', converted)
        const account = googleCalendarAccounts.find(acc => acc.id === converted.accountId)
        console.log('Found account:', account)

        if (converted.platformEventId) {
          // Reconstruct platform event so it persists across refreshes and keeps full opacity
          const existing = platformGroups.get(converted.platformEventId)
          const trainerName = account?.name || 'Trainer'
          const participants = (converted.attendees || []).map(a => ({
            id: a.email,
            name: a.name,
            email: a.email,
            status: 'active' as const,
            medicalConditions: [],
            lastAttendance: '',
            trainer: trainerName,
            phone: ''
          }))

          const basePlatform: CalendarEvent = existing?.base || {
            id: converted.platformEventId,
            title: converted.title,
            start: converted.start,
            end: converted.end,
            description: '',
            // Use workout calendar theme; platform events should be full opacity
            backgroundColor: '#3b82f6',
            borderColor: '#1e40af',
            source: 'platform' as const,
            extendedProps: {
              trainer: trainerName,
              participants,
              plan: converted.title,
              location: converted.location || '',
              maxParticipants: 0,
              currentParticipants: participants.length,
              medicalFlags: [],
              attendance: {}
            }
          }

          const linked = existing?.linked || {}
          if (converted.accountId && googleEvent.id) {
            linked[converted.accountId] = googleEvent.id
          }
          platformGroups.set(converted.platformEventId, { base: basePlatform, linked })
          continue
        }

        // External Google-only event (not linked to platform)
        const hide = !!account?.hideDetails
        const baseColor = account?.color || '#6b7280'
        const borderColor = account?.color || '#4b5563'

        const calendarEvent: CalendarEvent = {
          id: `google-${googleEvent.id}`,
          title: hide ? 'Busy' : converted.title,
          start: converted.start,
          end: converted.end,
          backgroundColor: hide ? rgba10(baseColor) : baseColor,
          borderColor: hide ? rgba10(borderColor) : borderColor,
          source: 'google',
          googleEventId: googleEvent.id,
          accountId: converted.accountId,
          accountEmail: converted.accountEmail,
          extendedProps: {
            trainer: hide ? 'Busy' : (account?.name || 'Google Calendar'),
            participants: [],
            plan: hide ? 'Busy' : converted.title,
            location: hide ? '' : (converted.location || ''),
            maxParticipants: 0,
            currentParticipants: 0,
            medicalFlags: [],
            attendance: {}
          }
        }
        externalGoogleEvents.push(calendarEvent)
      }

      // Intentionally not using reconstructed platform events

      console.log('External Google events:', externalGoogleEvents)

      setEvents(prev => {
        // Keep existing platform events as-is; do not reconstruct from Google mirrors
        const platformOnly = prev.filter(e => e.source === 'platform')

        // Build a set of linked Google ids from platform events to hide mirrors
        const linkedSet = new Set<string>()
        for (const ev of platformOnly) {
          const map = ev.syncedGoogleEventIds || {}
          for (const [accId, gId] of Object.entries(map)) {
            if (accId && gId) linkedSet.add(`${accId}|${gId}`)
          }
        }

        // Helper: check if a Google event overlaps a platform event with same title/time
        const overlapsPlatform = (g: { start: string; end: string; title: string; accountId?: string }) => {
          const gs = new Date(g.start).getTime()
          const ge = new Date(g.end).getTime()
          const THRESH = 2 * 60 * 1000 // 2 minutes
          return platformOnly.some(p => {
            const ps = new Date(p.start).getTime()
            const pe = new Date(p.end).getTime()
            const timesClose = Math.abs(ps - gs) <= THRESH && Math.abs(pe - ge) <= THRESH
            const titleMatch = (p.title || '').trim() === (g.title || '').trim()
            return timesClose && titleMatch
          })
        }

        // First, filter by visibility and remove any Google event already linked to a platform session
        const visibleGoogle = externalGoogleEvents.filter(e => {
          if (e.accountId && visibleAccounts[e.accountId] === false) return false
          const key = e.accountId && e.googleEventId ? `${e.accountId}|${e.googleEventId}` : null
          if (key && linkedSet.has(key)) return false
          if (overlapsPlatform({ start: e.start, end: e.end, title: e.title, accountId: e.accountId })) return false
          return true
        })

        // Deduplicate Google events by googleEventId (prefer tinted rgba 10% if available),
        // then by time/title signature across accounts
        const byId = new Map<string, CalendarEvent>()
        for (const ev of visibleGoogle) {
          const idKey = ev.googleEventId ? `${ev.googleEventId}` : `${ev.accountId}|${ev.id}`
          const isTinted = typeof ev.backgroundColor === 'string' && ev.backgroundColor.startsWith('rgba(')
          const existing = byId.get(idKey)
          if (!existing) {
            byId.set(idKey, ev)
            continue
          }
          const existingTinted = typeof existing.backgroundColor === 'string' && existing.backgroundColor.startsWith('rgba(')
          // Prefer tinted one
          if (isTinted && !existingTinted) byId.set(idKey, ev)
        }

        // Also dedupe by start/end/title signature, keep tinted preferred
        const bySig = new Map<string, CalendarEvent>()
        for (const ev of byId.values()) {
          const sig = `${ev.start}|${ev.end}|${(ev.title || '').trim()}`
          const existing = bySig.get(sig)
          const isTinted = typeof ev.backgroundColor === 'string' && ev.backgroundColor.startsWith('rgba(')
          if (!existing) {
            bySig.set(sig, ev)
            continue
          }
          const existingTinted = typeof existing.backgroundColor === 'string' && existing.backgroundColor.startsWith('rgba(')
          if (isTinted && !existingTinted) bySig.set(sig, ev)
        }

        const dedupedGoogle = Array.from(bySig.values())
        const nextEvents = [...platformOnly, ...dedupedGoogle]
        console.log('Updated events state (deduped):', nextEvents)
        return nextEvents
      })
    } else if (isGoogleCalendarConnected && googleCalendarEvents.length === 0) {
      console.log('Google Calendar connected but no events found')
      // Do not clear platform events; keep whatever is already in state
    } else {
      console.log('Google Calendar not connected or no events')
    }
  }, [googleCalendarEvents, isGoogleCalendarConnected, googleCalendarAccounts, convertFromGoogleEvent, visibleAccounts])


  


  // Schedule-X calendar setup
  const eventsService = useMemo(() => createEventsServicePlugin(), [])
  const dragAndDropPlugin = useMemo(() => createDragAndDropPlugin(), [])
  const resizePlugin = useMemo(() => createResizePlugin(30), []) // 30 minute intervals when resizing
  
  type CalendarTheme = {
    colorName: string
    lightColors: { main: string; container: string; onContainer: string }
    darkColors: { main: string; container: string; onContainer: string }
  }

  const dynamicCalendars = useMemo<Record<string, CalendarTheme>>(() => {
    const rgba10 = (hex: string) => {
      const m = hex?.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)
      if (!m) return 'rgba(107,114,128,0.1)'
      const r = Number.parseInt(m[1], 16)
      const g = Number.parseInt(m[2], 16)
      const b = Number.parseInt(m[3], 16)
      return `rgba(${r}, ${g}, ${b}, 0.1)`
    }
    const base: Record<string, CalendarTheme> = {
      'workout-calendar': {
        colorName: 'blue',
        lightColors: { main: '#3b82f6', container: '#dbeafe', onContainer: '#1e40af' },
        darkColors: { main: '#60a5fa', onContainer: '#dbeafe', container: '#1e3a8a' }
      }
    }
    for (const acc of googleCalendarAccounts) {
      const key = `gc-${acc.id}`
      const visibleColor = acc.color || '#3b82f6'
      const hiddenColor = rgba10(visibleColor)
      const main = acc.hideDetails ? hiddenColor : visibleColor
      // Use similar values for container/onContainer; tweak if needed
      base[key] = {
        colorName: 'custom',
        lightColors: { main, container: main, onContainer: '#111827' },
        darkColors: { main, onContainer: '#F9FAFB', container: main }
      }
    }
    return base
  }, [googleCalendarAccounts])

  const usersForFilter = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email?: string | null }>()
    for (const ev of events) {
      const parts = ev?.extendedProps?.participants || []
      for (const p of parts) {
        if (!p?.id) continue
        if (!map.has(p.id)) map.set(p.id, { id: p.id, name: p.name, email: p.email })
      }
    }
    return Array.from(map.values())
  }, [events])

  const spacesForFilter = useMemo(() => {
    const ids = new Set<string>()
    const list: { id: string; name: string }[] = []
    for (const s of workoutSpaces) {
      if (!ids.has(s.id)) {
        ids.add(s.id)
        list.push({ id: s.id, name: s.name })
      }
    }
    return list
  }, [workoutSpaces])

  const visibleEvents = useMemo(() => {
    let out = events
    if (selectedUserIds && selectedUserIds.length > 0) {
      const selectedUsers = new Set(selectedUserIds)
      out = out.filter(ev => {
        if (!ev?.extendedProps?.participants || ev.extendedProps.participants.length === 0) return false
        return ev.extendedProps.participants.some(p => selectedUsers.has(p.id))
      })
    }
    if (selectedSpaceIds && selectedSpaceIds.length > 0) {
      const selectedSpaces = new Set(selectedSpaceIds)
      out = out.filter(ev => {
        const evSpaceId = (ev as { workoutSpaceId?: string }).workoutSpaceId
        if (evSpaceId) return selectedSpaces.has(evSpaceId)
        const loc = ev?.extendedProps?.location || ''
        return Array.from(selectedSpaces).some(spaceId => {
          const ws = workoutSpaces.find(ws => ws.id === spaceId)
          return ws ? loc === ws.name : false
        })
      })
    }
    if (!showWater) out = out.filter(ev => ev.extendedProps?.kind !== 'water')
    // Hide completed water tasks
    out = out.filter(ev => !(ev.extendedProps?.kind === 'water' && ev.extendedProps?.status === 'complete'))
    if (!showSleep) out = out.filter(ev => ev.extendedProps?.kind !== 'sleep')
    // Hide completed sleep blocks
    out = out.filter(ev => !(ev.extendedProps?.kind === 'sleep' && ev.extendedProps?.status === 'complete'))
    return out
  }, [events, selectedUserIds, selectedSpaceIds, workoutSpaces, showWater, showSleep])

  const calendar = useCalendarApp({
    views: [createViewDay(), createViewWeek(), createViewMonthGrid(), createViewMonthAgenda()], // Pass all views to let Schedule-X handle view switching
    events: visibleEvents.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      calendarId: event.source === 'google' && event.accountId ? `gc-${event.accountId}` : 'workout-calendar'
    })),
    calendars: dynamicCalendars,
    plugins: [eventsService, dragAndDropPlugin, resizePlugin],
    theme: 'shadcn',
    isDark: true,

    callbacks: {
      onEventClick: (event) => {
        if (daySelection?.enabled) return
        const foundEvent = events.find(e => e.id === event.id)
        if (foundEvent) {
          setSelectedEvent(foundEvent)
          setDrawerMode('view')
          setDrawerOpen(true)
        }
      },
      onEventUpdate: async (updatedEvent) => {
        const existing = events.find(e => e.id === updatedEvent.id)
        if (existing && existing.source === 'google') {
          // Block drag/resize on Google events
          setEvents(prev => [...prev])
          return
        }
        if (!existing) return

        setEvents(prev => prev.map(event => 
          event.id === updatedEvent.id 
            ? { 
                ...event, 
                start: updatedEvent.start,
                end: updatedEvent.end 
              }
            : event
        ))

        // Sync platform event updates to the selected Google account(s)
        try {
          const scheduleXEvent = {
            id: existing.id,
            title: existing.title,
            start: updatedEvent.start,
            end: updatedEvent.end,
            description: existing.description || '',
            // Workout space maps to Google location
            location: existing.extendedProps?.location || '',
            attendees: existing.extendedProps?.participants?.map(p => ({ email: p.email, name: p.name })) || [],
            kind: existing.extendedProps?.kind
          }
          const gEvent = convertToGoogleEvent(scheduleXEvent)
          const selectedTargets = Array.isArray(existing.targetAccountIds) && existing.targetAccountIds.length > 0
            ? existing.targetAccountIds
            : (() => {
                const fallback = resolveTargetAccountId(existing)
                return fallback ? [fallback] : []
              })()
          if (selectedTargets.length === 0) {
            console.warn('No selected Google accounts found; skipping Google sync for update')
            return
          }
          const linked = existing.syncedGoogleEventIds || {}
          await Promise.all(selectedTargets.map(async targetId => {
            const linkedId = linked[targetId]
            if (linkedId) {
              await updateGoogleEvent(targetId, linkedId, gEvent)
            } else {
              const { id: createdId } = await createGoogleEvent(targetId, gEvent) as { id: string }
              setEvents(prev => prev.map(ev => ev.id === existing.id ? ({
                ...ev,
                syncedGoogleEventIds: { ...(ev.syncedGoogleEventIds || {}), [targetId]: createdId }
              }) : ev))
            }
          }))
        } catch (e) {
          console.error('Error preparing Google event update', e)
        }
      }
    }
  })



  // Update calendar events when events state changes
  useEffect(() => {
    console.log('Updating Schedule-X calendar with events:', visibleEvents)
    if (eventsService && calendar) {
      // Clear existing events and add new ones
      const existingEvents = eventsService.getAll()
      console.log('Clearing existing events:', existingEvents.length)
      existingEvents.forEach(event => {
        eventsService.remove(event.id)
      })
      
      console.log('Adding new events to Schedule-X:', visibleEvents.length)
      visibleEvents.forEach(event => {
        console.log('Adding event to Schedule-X:', {
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          source: event.source
        })
        eventsService.add({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          calendarId: event.source === 'google' && event.accountId ? `gc-${event.accountId}` : 'workout-calendar'
        })
      })
      
      console.log('Schedule-X calendar updated. Total events:', eventsService.getAll().length)
    }
  }, [visibleEvents, eventsService, calendar])


  // Force per-event colors (override theme vars) after render
  const calendarRootRef = useRef<HTMLDivElement>(null)
  const eventsRef = useRef<CalendarEvent[]>([])
  const accountsRef = useRef(googleCalendarAccounts)
  const headerBuildRaf = useRef<number | null>(null)
  const pointerInfoRef = useRef<{
    startX: number
    startY: number
    moved: boolean
    onResize: boolean
    eventId: string | null
    startedOnEvent: boolean
  } | null>(null)
  useEffect(() => { eventsRef.current = visibleEvents }, [visibleEvents])
  useEffect(() => { accountsRef.current = googleCalendarAccounts }, [googleCalendarAccounts])

  // Highlight selected days in headers/month cells when daySelection is enabled
  const applyDaySelectionStyles = useCallback(() => {
    try {
      if (!daySelection?.enabled) return
      const root = calendarRootRef.current
      if (!root) return
      const selected = new Set((daySelection.selectedDays || []).map(d => d.slice(0, 10)))

      const toKey = (d: Date): string => {
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`
      }
      const addDays = (key: string, offset: number): string => {
        const [y, m, d] = key.split('-').map(Number)
        const date = new Date()
        date.setFullYear(y)
        date.setMonth(m - 1)
        date.setDate(d + offset)
        return toKey(date)
      }

      // Week/day headers
      const dateNumberEls = Array.from(root.querySelectorAll('.sx__week-grid__date-number')) as HTMLElement[]
      dateNumberEls.forEach((el) => {
        try {
          const col = el.closest('[data-time-grid-date], [data-date]') as HTMLElement | null
          const dateStr = col?.getAttribute('data-time-grid-date') || col?.getAttribute('data-date') || null
          const key = dateStr ? dateStr.slice(0, 10) : null
          if (key && selected.has(key)) {
            // White chip for the date label
            el.style.backgroundColor = 'rgba(255,255,255,1)'
            el.style.color = 'rgba(0,0,0,0.95)'
            el.style.borderRadius = '6px'
            el.style.padding = '2px 6px'
            el.style.cursor = 'pointer'
            // Highlight whole column background subtly
            const colEl = el.closest('[data-time-grid-date], [data-date]') as HTMLElement | null
            if (colEl) {
              ;(colEl as HTMLElement).style.backgroundColor = 'rgba(59, 130, 246, 0.08)'
              ;(colEl as HTMLElement).style.cursor = 'pointer'
              // Connected white border across contiguous selected columns
              const prevSel = selected.has(addDays(key, -1))
              const nextSel = selected.has(addDays(key, 1))
              ;(colEl as HTMLElement).style.borderTop = '2px solid rgba(255,255,255,1)'
              ;(colEl as HTMLElement).style.borderBottom = '2px solid rgba(255,255,255,1)'
              ;(colEl as HTMLElement).style.borderLeft = prevSel ? '0' : '2px solid rgba(255,255,255,1)'
              ;(colEl as HTMLElement).style.borderRight = nextSel ? '0' : '2px solid rgba(255,255,255,1)'
              ;(colEl as HTMLElement).style.borderTopLeftRadius = prevSel ? '0' : '8px'
              ;(colEl as HTMLElement).style.borderBottomLeftRadius = prevSel ? '0' : '8px'
              ;(colEl as HTMLElement).style.borderTopRightRadius = nextSel ? '0' : '8px'
              ;(colEl as HTMLElement).style.borderBottomRightRadius = nextSel ? '0' : '8px'
              ;(colEl as HTMLElement).style.boxSizing = 'border-box'
            }
          } else {
            el.style.backgroundColor = ''
            el.style.color = ''
            el.style.borderRadius = ''
            el.style.padding = ''
            el.style.cursor = 'pointer'
            const colEl = el.closest('[data-time-grid-date], [data-date]') as HTMLElement | null
            if (colEl) {
              ;(colEl as HTMLElement).style.backgroundColor = ''
              ;(colEl as HTMLElement).style.cursor = 'pointer'
              ;(colEl as HTMLElement).style.borderTop = ''
              ;(colEl as HTMLElement).style.borderBottom = ''
              ;(colEl as HTMLElement).style.borderLeft = ''
              ;(colEl as HTMLElement).style.borderRight = ''
              ;(colEl as HTMLElement).style.borderTopLeftRadius = ''
              ;(colEl as HTMLElement).style.borderBottomLeftRadius = ''
              ;(colEl as HTMLElement).style.borderTopRightRadius = ''
              ;(colEl as HTMLElement).style.borderBottomRightRadius = ''
            }
          }
        } catch { /* noop */ }
      })

      // Month grid cells
      const monthDayEls = Array.from(root.querySelectorAll('.sx__month-grid__day')) as HTMLElement[]
      monthDayEls.forEach((el) => {
        try {
          const dateStr = el.getAttribute('data-date')
            || (el.closest('[data-date]') as HTMLElement | null)?.getAttribute('data-date')
            || (el.closest('[data-time-grid-date]') as HTMLElement | null)?.getAttribute('data-time-grid-date')
            || null
          const key = dateStr ? dateStr.slice(0, 10) : null
          if (key && selected.has(key)) {
            el.style.outline = '2px solid rgba(59, 130, 246, 0.9)'
            el.style.outlineOffset = '2px'
            el.style.borderRadius = '6px'
            el.style.backgroundColor = 'rgba(255,255,255,0.85)'
            el.style.cursor = 'pointer'
            // Connected white border horizontally in month grid
            const prevSel = selected.has(addDays(key, -1))
            const nextSel = selected.has(addDays(key, 1))
            el.style.borderTop = '2px solid rgba(255,255,255,1)'
            el.style.borderBottom = '2px solid rgba(255,255,255,1)'
            el.style.borderLeft = prevSel ? '0' : '2px solid rgba(255,255,255,1)'
            el.style.borderRight = nextSel ? '0' : '2px solid rgba(255,255,255,1)'
            el.style.borderTopLeftRadius = prevSel ? '0' : '8px'
            el.style.borderBottomLeftRadius = prevSel ? '0' : '8px'
            el.style.borderTopRightRadius = nextSel ? '0' : '8px'
            el.style.borderBottomRightRadius = nextSel ? '0' : '8px'
            el.style.boxSizing = 'border-box'
          } else {
            el.style.outline = ''
            el.style.outlineOffset = ''
            el.style.borderRadius = ''
            el.style.backgroundColor = ''
            el.style.cursor = 'pointer'
            el.style.borderTop = ''
            el.style.borderBottom = ''
            el.style.borderLeft = ''
            el.style.borderRight = ''
            el.style.borderTopLeftRadius = ''
            el.style.borderBottomLeftRadius = ''
            el.style.borderTopRightRadius = ''
            el.style.borderBottomRightRadius = ''
          }
        } catch { /* noop */ }
      })
    } catch { /* noop */ }
  }, [daySelection?.enabled, daySelection?.selectedDays])

  useEffect(() => {
    applyDaySelectionStyles()
  }, [applyDaySelectionStyles])

  // Helper to clear preview event block
  const clearPreviewBlock = useCallback(() => {
    try {
      const id = previewEventIdRef.current
      if (id) {
        eventsService.remove(id)
      }
    } catch {
      // noop
    } finally {
      previewEventIdRef.current = null
    }
  }, [eventsService])

  // Delegate click on time grid to open create drawer with prefill and show a 10% opacity placeholder
  useEffect(() => {
    // Disable session creation interactions when in day selection mode
    if (daySelection?.enabled) return
    const root = calendarRootRef.current
    if (!root) return

    const findHourHeight = (col: HTMLElement): number | null => {
      const hourEl = col.querySelector('.sx__time-grid__hour, .sx__time-grid-hour') as HTMLElement | null
      if (hourEl) return hourEl.getBoundingClientRect().height
      const anyHour = root.querySelector('.sx__time-grid__hour, .sx__time-grid-hour') as HTMLElement | null
      if (anyHour) return anyHour.getBoundingClientRect().height
      // Fallback: derive from column full scroll height
      const totalHeight = (col as HTMLElement).scrollHeight || (col as HTMLElement).getBoundingClientRect().height
      return totalHeight ? totalHeight / 24 : null
    }

    const findColumnEl = (startEl: HTMLElement | null): HTMLElement | null => {
      if (!startEl) return null
      const selectors = [
        '[data-time-grid-date]',
        '[data-date]',
        '.sx__time-grid__day',
        '.sx__time-grid-day',
        '.sx__day-column'
      ]
      for (const sel of selectors) {
        const el = startEl.closest(sel) as HTMLElement | null
        if (el) return el
      }
      return null
    }

    const extractDateString = (col: HTMLElement | null): string | null => {
      if (!col) return null
      const fromAttr = col.getAttribute('data-time-grid-date')
        || col.getAttribute('data-date')
        || (col as HTMLElement & { dataset?: Record<string, string> }).dataset?.timeGridDate
        || (col as HTMLElement & { dataset?: Record<string, string> }).dataset?.date
      return fromAttr || null
    }

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Ignore clicks on existing events or headers
      if (target.closest('.sx__event')) return

      const col = findColumnEl(target)
      if (!col) return

      const dateStr = extractDateString(col)
      if (!dateStr) return

      const hourHeight = findHourHeight(col)
      if (!hourHeight || hourHeight <= 0) return

      // Determine the true scrollable ancestor to compute pointer offset accurately
      const findScrollableAncestor = (start: HTMLElement): HTMLElement | null => {
        let cur: HTMLElement | null = start
        while (cur && cur !== root) {
          const style = window.getComputedStyle(cur)
          if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && cur.scrollHeight > cur.clientHeight) {
            return cur
          }
          cur = cur.parentElement as HTMLElement | null
        }
        return (root.querySelector('.sx__view-container') as HTMLElement) || null
      }
      const scrollable = findScrollableAncestor(col) || root
      const containerRect = scrollable.getBoundingClientRect()
      const y = e.clientY - containerRect.top + scrollable.scrollTop
      let hour = Math.floor(y / hourHeight)
      if (hour < 0) hour = 0
      if (hour > 23) hour = 23
      const pad = (n: number) => String(n).padStart(2, '0')
      const start = `${dateStr} ${pad(hour)}:00`
      const end = `${dateStr} ${pad(Math.min(hour + 1, 23))}:59`

      // Set prefill and open drawer
      setPrefillDates({ start, end })
      setDrawerMode('create')
      setDrawerOpen(true)

      // Add a preview placeholder block via eventsService
      try {
        // Remove previous preview if any
        clearPreviewBlock()
        const id = `preview-${Date.now()}`
        previewEventIdRef.current = id
        eventsService.add({
          id,
          title: 'New Session',
          start,
          end,
          calendarId: 'workout-calendar'
        })
        // Style the preview block with 10% opacity
        requestAnimationFrame(() => {
          try {
            const el = root.querySelector(`[data-event-id="${id}"]`) as HTMLElement | null
            if (el) {
              el.style.backgroundColor = 'rgba(59, 130, 246, 0.10)'
              el.style.borderColor = 'rgba(59, 130, 246, 0.20)'
              el.style.setProperty('border-inline-start-color', 'rgba(59, 130, 246, 0.20)')
              el.style.color = 'rgba(255,255,255,0.6)'
            }
          } catch {
            // noop
          }
        })
      } catch {
        // noop
      }
    }

    root.addEventListener('click', onClick)
    return () => {
      root.removeEventListener('click', onClick)
    }
  }, [eventsService, clearPreviewBlock, daySelection?.enabled])

  // Day selection interactions: click on header date numbers or month grid days to toggle
  useEffect(() => {
    if (!daySelection?.enabled) return
    const root = calendarRootRef.current
    if (!root || !daySelection?.onToggleDay) return

    const getDateFromTarget = (target: HTMLElement | null): string | null => {
      if (!target) return null
      // Header date number → find closest column with date attrs
      const headerNum = target.closest('.sx__week-grid__date-number') as HTMLElement | null
      if (headerNum) {
        const col = headerNum.closest('[data-time-grid-date], [data-date]') as HTMLElement | null
        const dateStr = col?.getAttribute('data-time-grid-date') || col?.getAttribute('data-date') || null
        return dateStr ? dateStr.slice(0, 10) : null
      }
      // Month grid cell
      const monthCell = target.closest('.sx__month-grid__day') as HTMLElement | null
      if (monthCell) {
        const dateStr = monthCell.getAttribute('data-date')
          || (monthCell.closest('[data-date]') as HTMLElement | null)?.getAttribute('data-date')
          || null
        return dateStr ? dateStr.slice(0, 10) : null
      }
      return null
    }

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      const dateKey = getDateFromTarget(t)
      if (!dateKey) return
      e.stopPropagation()
      e.preventDefault()
      try { daySelection.onToggleDay(dateKey) } catch { /* noop */ }
    }

    root.addEventListener('click', onClick, true)
    return () => { root.removeEventListener('click', onClick, true as unknown as EventListenerOptions) }
  }, [daySelection])

  // Event interactions: open on true click, allow drag-move and resize without opening
  useEffect(() => {
    const root = calendarRootRef.current
    if (!root) return
    const CLICK_MOVE_TOLERANCE = 5
    const getEventIdFromTarget = (evtTarget: EventTarget | null): string | null => {
      const el = (evtTarget as HTMLElement | null)?.closest('[data-event-id], .sx__event') as HTMLElement | null
      if (!el) return null
      const id = el.getAttribute('data-event-id')
      return id || null
    }
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      const eventId = getEventIdFromTarget(target)
      const onResize = !!(target.closest('.sx__event__resize-handle') || target.closest('.sx__time-grid-event-resize-handle'))
      const startedOnEvent = !!eventId
      pointerInfoRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
        onResize,
        eventId: eventId || null,
        startedOnEvent
      }
    }
    const onPointerMove = (e: PointerEvent) => {
      const info = pointerInfoRef.current
      if (!info) return
      const dx = Math.abs(e.clientX - info.startX)
      const dy = Math.abs(e.clientY - info.startY)
      if (dx > CLICK_MOVE_TOLERANCE || dy > CLICK_MOVE_TOLERANCE) {
        info.moved = true
      }
    }
    const onPointerUp = () => {
      const info = pointerInfoRef.current
      pointerInfoRef.current = null
      if (!info) return
      if (!info.startedOnEvent) return
      if (info.onResize || info.moved) return
      const id = info.eventId
      if (!id) return
      const found = eventsRef.current.find(ev => ev.id === id)
      if (!found) return
      setSelectedEvent(found)
      setDrawerMode('view')
      setDrawerOpen(true)
    }
    root.addEventListener('pointerdown', onPointerDown, true)
    root.addEventListener('pointermove', onPointerMove, true)
    root.addEventListener('pointerup', onPointerUp, true)
    root.addEventListener('pointercancel', onPointerUp, true)
    return () => {
      root.removeEventListener('pointerdown', onPointerDown, true as unknown as EventListenerOptions)
      root.removeEventListener('pointermove', onPointerMove, true as unknown as EventListenerOptions)
      root.removeEventListener('pointerup', onPointerUp, true as unknown as EventListenerOptions)
      root.removeEventListener('pointercancel', onPointerUp, true as unknown as EventListenerOptions)
    }
  }, [])

  useEffect(() => {
    if (!visibleEvents || visibleEvents.length === 0) return
    const applyColors = () => {
      try {
        eventsRef.current.forEach(ev => {
          const el = document.querySelector(`[data-event-id="${ev.id}"]`) as HTMLElement | null
          if (!el) return

          // Style Google events per-account
          if (ev.source === 'google') {
            if (ev.backgroundColor) el.style.backgroundColor = ev.backgroundColor
            if (ev.borderColor) {
              el.style.setProperty('border-inline-start-color', ev.borderColor)
              el.style.borderColor = ev.borderColor
            }
            const acc = accountsRef.current.find(a => a.id === ev.accountId)
            const textColor = acc?.hideDetails ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,1)'
            el.style.color = textColor
            el.style.setProperty('--sx-color-on-blue-container', textColor)
            el.style.setProperty('--sx-color-on-primary-container', textColor)
            return
          }

          // Style sleep events (platform) with purple border + short gradient and white text
          if (ev.source === 'platform' && ev?.extendedProps?.kind === 'sleep') {
            const purple = '#8b5cf6' // Tailwind violet-500
            // Remove any default fill and apply short horizontal gradient from the left
            el.style.setProperty('background-color', 'transparent', 'important')
            el.style.setProperty('background-image', 'linear-gradient(90deg, rgba(139, 92, 246, 0.45) 0%, rgba(139, 92, 246, 0.0) 35%)', 'important')
            el.style.setProperty('background', 'linear-gradient(90deg, rgba(139, 92, 246, 0.45) 0%, rgba(139, 92, 246, 0.0) 35%)', 'important')
            // Force left accent/border to purple and remove default accent highlight
            el.style.setProperty('border-inline-start-color', purple, 'important')
            el.style.setProperty('border-inline-start-width', '3px', 'important')
            el.style.setProperty('border-left-width', '3px', 'important')
            el.style.setProperty('border-color', purple, 'important')
            // Ensure text is white for contrast
            el.style.setProperty('color', 'rgba(255,255,255,1)', 'important')
            el.style.setProperty('--sx-color-on-blue-container', 'rgba(255,255,255,1)', 'important')
            el.style.setProperty('--sx-color-on-primary-container', 'rgba(255,255,255,1)', 'important')
            // Reduce any hover/active highlight by clearing box shadow if present
            el.style.setProperty('box-shadow', 'none', 'important')
          }

          // Style water events (platform) with blue border + short gradient and white text
          if (ev.source === 'platform' && ev?.extendedProps?.kind === 'water') {
            const blue = '#3b82f6' // Tailwind blue-500
            el.style.setProperty('background-color', 'transparent', 'important')
            el.style.setProperty('background-image', 'linear-gradient(90deg, rgba(59, 130, 246, 0.45) 0%, rgba(59, 130, 246, 0.0) 35%)', 'important')
            el.style.setProperty('background', 'linear-gradient(90deg, rgba(59, 130, 246, 0.45) 0%, rgba(59, 130, 246, 0.0) 35%)', 'important')
            el.style.setProperty('border-inline-start-color', blue, 'important')
            el.style.setProperty('border-inline-start-width', '3px', 'important')
            el.style.setProperty('border-left-width', '3px', 'important')
            el.style.setProperty('border-color', blue, 'important')
            el.style.setProperty('color', 'rgba(255,255,255,1)', 'important')
            el.style.setProperty('--sx-color-on-blue-container', 'rgba(255,255,255,1)', 'important')
            el.style.setProperty('--sx-color-on-primary-container', 'rgba(255,255,255,1)', 'important')
            el.style.setProperty('box-shadow', 'none', 'important')
          }
        })
        // Apply day selection overlays if enabled
        try { applyDaySelectionStyles() } catch { /* noop */ }
      } catch {
        // noop
      }
    }
    const raf = requestAnimationFrame(() => {
      applyColors()
      setTimeout(applyColors, 0)
    })
    return () => cancelAnimationFrame(raf)
  }, [visibleEvents, applyDaySelectionStyles])

  // Re-apply colors whenever Schedule-X re-renders DOM (view change, navigation)
  useEffect(() => {
    const root = calendarRootRef.current
    if (!root) return
    const observer = new MutationObserver(() => {
      try {
        const current = eventsRef.current
        current.forEach(ev => {
          const el = root.querySelector(`[data-event-id="${ev.id}"]`) as HTMLElement | null
          if (!el) return

          if (ev.source === 'google') {
            if (ev.backgroundColor) el.style.backgroundColor = ev.backgroundColor
            if (ev.borderColor) {
              el.style.setProperty('border-inline-start-color', ev.borderColor)
              el.style.borderColor = ev.borderColor
            }
            const acc = accountsRef.current.find(a => a.id === ev.accountId)
            const textColor = acc?.hideDetails ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,1)'
            el.style.color = textColor
            el.style.setProperty('--sx-color-on-blue-container', textColor)
            el.style.setProperty('--sx-color-on-primary-container', textColor)
            return
          }

          if (ev.source === 'platform' && ev?.extendedProps?.kind === 'sleep') {
            const purple = '#8b5cf6'
            el.style.setProperty('background-color', 'transparent', 'important')
            el.style.setProperty('background-image', 'linear-gradient(90deg, rgba(139, 92, 246, 0.45) 0%, rgba(139, 92, 246, 0.0) 35%)', 'important')
            el.style.setProperty('background', 'linear-gradient(90deg, rgba(139, 92, 246, 0.45) 0%, rgba(139, 92, 246, 0.0) 35%)', 'important')
            el.style.setProperty('border-inline-start-color', purple, 'important')
            el.style.setProperty('border-inline-start-width', '3px', 'important')
            el.style.setProperty('border-left-width', '3px', 'important')
            el.style.setProperty('border-color', purple, 'important')
            el.style.setProperty('color', 'rgba(255,255,255,1)', 'important')
            el.style.setProperty('--sx-color-on-blue-container', 'rgba(255,255,255,1)', 'important')
            el.style.setProperty('--sx-color-on-primary-container', 'rgba(255,255,255,1)', 'important')
            el.style.setProperty('box-shadow', 'none', 'important')
          }

          if (ev.source === 'platform' && ev?.extendedProps?.kind === 'water') {
            const blue = '#3b82f6'
            el.style.setProperty('background-color', 'transparent', 'important')
            el.style.setProperty('background-image', 'linear-gradient(90deg, rgba(59, 130, 246, 0.45) 0%, rgba(59, 130, 246, 0.0) 35%)', 'important')
            el.style.setProperty('background', 'linear-gradient(90deg, rgba(59, 130, 246, 0.45) 0%, rgba(59, 130, 246, 0.0) 35%)', 'important')
            el.style.setProperty('border-inline-start-color', blue, 'important')
            el.style.setProperty('border-inline-start-width', '3px', 'important')
            el.style.setProperty('border-left-width', '3px', 'important')
            el.style.setProperty('border-color', blue, 'important')
            el.style.setProperty('color', 'rgba(255,255,255,1)', 'important')
            el.style.setProperty('--sx-color-on-blue-container', 'rgba(255,255,255,1)', 'important')
            el.style.setProperty('--sx-color-on-primary-container', 'rgba(255,255,255,1)', 'important')
            el.style.setProperty('box-shadow', 'none', 'important')
          }
        })
        // Also rebuild meal header UI after DOM changes, debounced per frame
        try {
          if (headerBuildRaf.current != null) return
          headerBuildRaf.current = requestAnimationFrame(() => {
            try {
              rebuildMealHeaders()
            } finally {
              headerBuildRaf.current = null
            }
          })
        } catch {
          // noop
        }
      } catch {
        // noop
      }
    })
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
    return () => {
      if (headerBuildRaf.current != null) cancelAnimationFrame(headerBuildRaf.current)
    }
  }, [])

  // Build meal header UI (meal icon + kcal net pill) in week & day view headers
  function rebuildMealHeaders() {
    try {
      const root = calendarRootRef.current
      if (!root) return
      const dateNumberEls = Array.from(root.querySelectorAll('.sx__week-grid__date-number')) as HTMLElement[]
      if (!dateNumberEls || dateNumberEls.length === 0) return
      const computeOutKcalsForDate = (dateStr: string | null): number => {
        if (!dateStr) return 0
        try {
          const items = eventsRef.current || []
          let total = 0
          for (const ev of items) {
            if (ev.source !== 'platform') continue
            if (!ev.start) continue
            const evDate = (ev.start || '').slice(0, 10)
            if (evDate !== dateStr) continue
            const kcal = Number(ev.extendedProps?.workoutTemplate?.estimatedCalories || 0)
            if (!Number.isNaN(kcal)) total += kcal
          }
          return total
        } catch {
          return 0
        }
      }
      const computeNetKcals = (outKcals: number, inKcals: number) => outKcals - inKcals
      for (const dateEl of dateNumberEls) {
        const headerRow = dateEl.parentElement as HTMLElement | null
        if (!headerRow) continue
        const col = (dateEl.closest('[data-time-grid-date], [data-date]') as HTMLElement | null)
        const dateStr = col?.getAttribute('data-time-grid-date') || col?.getAttribute('data-date') || null

        headerRow.style.display = 'flex'
        headerRow.style.alignItems = 'center'
        headerRow.style.justifyContent = 'space-between'

        const existing = headerRow.querySelector('.wl-meal-ui') as HTMLElement | null
        const out = computeOutKcalsForDate(dateStr)
        // Sum planned food kcals for the day
        let inn = 0
        try {
          const rawFood = typeof window !== 'undefined' ? localStorage.getItem('fitspo:food_kcals_by_day') : null
          const foodMap: Record<string, number> = rawFood ? JSON.parse(rawFood) : {}
          inn = Math.max(0, Number(foodMap[dateStr || ''] || 0))
        } catch { /* ignore */ }
        const net = computeNetKcals(out, inn)
        if (existing && existing.getAttribute('data-net') === String(net)) continue
        const positive = net > 0
        const negative = net < 0

        const rightWrap = existing || document.createElement('div')
        if (!existing) {
          rightWrap.className = 'wl-meal-ui ml-2 inline-flex items-center gap-2'
          headerRow.appendChild(rightWrap)
        } else {
          while (rightWrap.firstChild) rightWrap.removeChild(rightWrap.firstChild)
        }
        rightWrap.setAttribute('data-net', String(net))

        const netPill = document.createElement('span')
        netPill.className = `inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium border ${positive ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : negative ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-muted text-foreground/60 border-border/40'}`
        const iconMountForNet = document.createElement('span')
        iconMountForNet.className = 'inline-flex'
        netPill.appendChild(iconMountForNet)
        try {
          const r = createRoot(iconMountForNet)
          if (positive) r.render(<Plus className="w-3 h-3" />)
          else if (negative) r.render(<Minus className="w-3 h-3" />)
          else r.render(<span className="w-3 h-3" />)
        } catch {
          // noop
        }
        const value = document.createElement('span')
        value.className = 'tabular-nums'
        value.textContent = `${net}`
        netPill.appendChild(value)

        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'inline-flex size-6 items-center justify-center rounded hover:bg-muted/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        btn.title = 'Manage meals for this day'
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          // Normalize to YYYY-MM-DD for consistent localStorage keys
          const dayKey = dateStr ? dateStr.slice(0, 10) : null
          setNutritionDrawerDate(dayKey)
          setNutritionDrawerOpen(true)
        })

        const iconMount = document.createElement('span')
        iconMount.className = 'pointer-events-none'
        btn.appendChild(iconMount)
        try {
          const root = createRoot(iconMount)
          root.render(<ChefHat className="w-4 h-4" />)
        } catch {
          // noop
        }

        rightWrap.appendChild(netPill)
        rightWrap.appendChild(btn)
      }

      // Day view header (single day)
      const dayHeading = root.querySelector('.sx__day-view .sx__range-heading') as HTMLElement | null
      if (dayHeading) {
        dayHeading.style.display = 'flex'
        dayHeading.style.alignItems = 'center'
        dayHeading.style.justifyContent = 'space-between'
        const existingSingle = dayHeading.querySelector('.wl-meal-ui-single') as HTMLElement | null
        const wrap = existingSingle || document.createElement('div')
        if (!existingSingle) {
          wrap.className = 'wl-meal-ui-single ml-2 inline-flex items-center gap-2'
          dayHeading.appendChild(wrap)
        } else {
          while (wrap.firstChild) wrap.removeChild(wrap.firstChild)
        }

        const dayCol = root.querySelector('.sx__day-view [data-time-grid-date], .sx__day-view [data-date]') as HTMLElement | null
        const dayDateRaw = dayCol?.getAttribute('data-time-grid-date') || dayCol?.getAttribute('data-date') || null
        // Normalize to YYYY-MM-DD for consistent comparisons and storage
        const dayDate = dayDateRaw ? dayDateRaw.slice(0, 10) : null
        const out = computeOutKcalsForDate(dayDate)
        let inn = 0
        try {
          const rawFood = typeof window !== 'undefined' ? localStorage.getItem('fitspo:food_kcals_by_day') : null
          const foodMap: Record<string, number> = rawFood ? JSON.parse(rawFood) : {}
          inn = Math.max(0, Number(foodMap[dayDate || ''] || 0))
        } catch { /* ignore */ }
        const net = computeNetKcals(out, inn)
        if (existingSingle && existingSingle.getAttribute('data-net') === String(net)) return
        const positive = net > 0
        const negative = net < 0

        const netPill = document.createElement('span')
        netPill.className = `inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium border ${positive ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : negative ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-muted text-foreground/60 border-border/40'}`
        const iconMountForNet = document.createElement('span')
        iconMountForNet.className = 'inline-flex'
        netPill.appendChild(iconMountForNet)
        try {
          const m = createRoot(iconMountForNet)
          if (positive) m.render(<Plus className="w-3 h-3" />)
          else if (negative) m.render(<Minus className="w-3 h-3" />)
          else m.render(<span className="w-3 h-3" />)
        } catch {
          // noop
        }
        const value = document.createElement('span')
        value.className = 'tabular-nums'
        value.textContent = `${net}`
        netPill.appendChild(value)

        const mealBtn = document.createElement('button')
        mealBtn.type = 'button'
        mealBtn.className = 'inline-flex size-6 items-center justify-center rounded hover:bg-muted/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        mealBtn.title = 'Manage meals for this day'
        mealBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          setNutritionDrawerDate(dayDate)
          setNutritionDrawerOpen(true)
        })
        const mealIcon = document.createElement('span')
        mealIcon.className = 'pointer-events-none'
        mealBtn.appendChild(mealIcon)
        try {
          const mount = createRoot(mealIcon)
          mount.render(<ChefHat className="w-4 h-4" />)
        } catch {
          // noop
        }

        const sleepBtn = document.createElement('button')
        sleepBtn.type = 'button'
        sleepBtn.className = 'inline-flex size-6 items-center justify-center rounded hover:bg-muted/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        sleepBtn.title = 'Manage sleep for this day'
        sleepBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          setSleepDrawerDate(dayDate)
          setSleepDrawerOpen(true)
        })
        const sleepIcon = document.createElement('span')
        sleepIcon.className = 'pointer-events-none'
        sleepBtn.appendChild(sleepIcon)
        try {
          const m2 = createRoot(sleepIcon)
          m2.render(<Moon className="w-4 h-4" />)
        } catch {
          // noop
        }

        wrap.setAttribute('data-net', String(net))
        wrap.appendChild(netPill)
        wrap.appendChild(mealBtn)
        wrap.appendChild(sleepBtn)
      }
    } catch {
      // noop
    }
  }

  useEffect(() => {
    rebuildMealHeaders()
  }, [])

  // Refresh meal headers when nutrition logs or recipes change
  useEffect(() => {
    const onChange = () => {
      try { rebuildMealHeaders() } catch { /* noop */ }
      try { setNutritionVersion((v) => v + 1) } catch { /* noop */ }
    }
    try {
      if (typeof window !== 'undefined') {
        window.addEventListener('fitspo:logs_changed', onChange)
      }
    } catch { /* noop */ }
    return () => {
      try {
        if (typeof window !== 'undefined') {
          window.removeEventListener('fitspo:logs_changed', onChange)
        }
      } catch { /* noop */ }
    }
  }, [])





  // Memoize add event handler
  const handleAddEvent = useCallback(() => {
    setDrawerMode('create')
    setDrawerOpen(true)
  }, [])

  // Removed custom event creation - will implement later

  // Removed custom event creator - will implement later



  const updateAttendance = useCallback((eventId: string, userId: string, status: 'present' | 'absent' | 'late' | 'cancelled') => {
    setEvents(prev => prev.map(event => {
      if (event.id === eventId) {
        return {
          ...event,
          extendedProps: {
            ...event.extendedProps,
            attendance: {
              ...event.extendedProps.attendance,
              [userId]: status
            }
          }
        }
      }
      return event
    }))
  }, [])

  const handleCreateEvent = async (eventData: CalendarEvent) => {
    // Clear any preview block once we commit to creating
    clearPreviewBlock()
    const platformEvent: CalendarEvent = {
      ...eventData,
      source: 'platform',
      syncedGoogleEventIds: eventData.syncedGoogleEventIds || {}
    }
    // Persist to DB first to get a stable UUID id, then set events with DB id
    let createdSessionId: string | null = null
    try {
      const { data: inserted, error } = await supabase
        .from('workout_sessions')
        .insert({
          owner_id: (await supabase.auth.getUser()).data.user?.id,
          title: platformEvent.title,
          start_at: toIsoFromLocal(platformEvent.start),
          end_at: toIsoFromLocal(platformEvent.end),
          description: platformEvent.description || '',
          location: platformEvent.extendedProps?.location || '',
          background_color: platformEvent.backgroundColor,
          border_color: platformEvent.borderColor,
          workout_space_id: platformEvent.workoutSpaceId || null,
          workout_template_id: platformEvent.extendedProps?.workoutTemplate?.id || null,
          google_linked: platformEvent.syncedGoogleEventIds || {}
        })
        .select('id')
        .single()
      if (error) throw error
      const newId = inserted.id as string
      createdSessionId = newId

      // Insert participants
      const parts = platformEvent.extendedProps?.participants || []
      if (parts.length > 0) {
        const rows = parts.map(p => ({ session_id: newId, user_id: p.id }))
        await supabase.from('workout_session_participants').insert(rows)
      }

      const stored: CalendarEvent = { ...platformEvent, id: newId }
      setEvents(prev => prev.map(e => e.id === platformEvent.id ? stored : e).concat(prev.every(e => e.id !== platformEvent.id) ? [stored] : []))

      // Trigger onboarding update for workout session completion
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fitspo:workout_session_created'))
      }
    } catch (e) {
      console.error('Failed to persist workout session', e)
      // Fallback to local insert to avoid UX loss
      setEvents(prev => [...prev, platformEvent])
    }

    // Sync workout completion to fitness logs for active plans
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id
      if (userId && platformEvent.extendedProps?.workoutTemplate) {
        const sessionDate = platformEvent.start.split('T')[0]
        const calories = platformEvent.extendedProps.workoutTemplate.estimatedCalories || 300
        await syncService.syncWorkoutCompletionToFitness(
          createdSessionId || platformEvent.id,
          userId,
          {
            calories,
            date: sessionDate,
            templateId: platformEvent.extendedProps.workoutTemplate.id
          }
        )
      }
    } catch (error) {
      console.error('Failed to sync workout to fitness logs:', error)
    }

    if (isGoogleCalendarConnected && googleCalendarAccounts.length > 0) {
      try {
        const scheduleXEvent = {
          id: platformEvent.id,
          title: platformEvent.title,
          start: platformEvent.start,
          end: platformEvent.end,
          description: platformEvent.description || '',
          // Workout space maps to Google location
          location: platformEvent.extendedProps?.location || '',
          attendees: platformEvent.extendedProps?.participants?.map(p => ({ email: p.email, name: p.name })) || [],
          kind: platformEvent.extendedProps?.kind
        }
        const gEvent = convertToGoogleEvent(scheduleXEvent)
        const selectedTargets = Array.isArray(platformEvent.targetAccountIds) && platformEvent.targetAccountIds.length > 0
          ? platformEvent.targetAccountIds
          : (() => {
              const fallback = resolveTargetAccountId(platformEvent)
              return fallback ? [fallback] : []
            })()
        if (selectedTargets.length === 0) {
          console.warn('No selected Google accounts found; skipping Google sync for create')
          return
        }
        await Promise.all(selectedTargets.map(async targetId => {
          const { id: createdId } = await createGoogleEvent(targetId, gEvent) as { id: string }
          const dbId = (createdSessionId as string) || platformEvent.id
          setEvents(prev => prev.map(ev => ev.id === dbId ? ({
            ...ev,
            syncedGoogleEventIds: { ...(ev.syncedGoogleEventIds || {}), [targetId]: createdId }
          }) : ev))
          try {
            // Persist linkage to DB using the DB id
            await supabase.from('workout_sessions')
              .update({ google_linked: { ...(platformEvent.syncedGoogleEventIds || {}), [targetId]: createdId } })
              .eq('id', dbId)
          } catch {
            // non-fatal: linkage will be rebuilt on next sync
          }
        }))
      } catch (e) {
        console.error('Failed to prepare Google event creation', e)
      }
    }
  }

  const handleUpdateEvent = async (eventId: string, partial: Partial<CalendarEvent>) => {
    const existing = events.find(e => e.id === eventId)
    if (!existing) return
    if (existing.source === 'google') {
      // Do not allow editing Google events here
      return
    }

    // Merge update locally
    setEvents(prev => prev.map(ev => {
      if (ev.id !== eventId) return ev
      const merged: CalendarEvent = {
        ...ev,
        ...partial,
        extendedProps: { ...ev.extendedProps, ...(partial.extendedProps || {}) }
      }
      return merged
    }))

    // Persist to DB
    try {
      const next = events.find(e => e.id === eventId)
      const merged: CalendarEvent = {
        ...(next as CalendarEvent),
        ...partial,
        extendedProps: { ...(next as CalendarEvent).extendedProps, ...(partial.extendedProps || {}) }
      }
      await supabase.from('workout_sessions')
        .update({
          title: merged.title,
          start_at: toIsoFromLocal(merged.start),
          end_at: toIsoFromLocal(merged.end),
          description: merged.description || '',
          location: merged.extendedProps?.location || '',
          workout_space_id: merged.workoutSpaceId || null,
          workout_template_id: merged.extendedProps?.workoutTemplate?.id || null
        })
        .eq('id', eventId)

      // Upsert participants
      const parts = merged.extendedProps?.participants || []
      await supabase.from('workout_session_participants').delete().eq('session_id', eventId)
      if (parts.length > 0) {
        const rows = parts.map(p => ({ session_id: eventId, user_id: p.id }))
        await supabase.from('workout_session_participants').insert(rows)
      }
    } catch (e) {
      console.error('Failed to persist session update', e)
    }

    // Sync workout completion/status changes to fitness logs for active plans
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id
      if (userId && partial.extendedProps?.workoutTemplate) {
        const sessionDate = existing.start.split('T')[0]
        const calories = partial.extendedProps.workoutTemplate.estimatedCalories || 300
        await syncService.syncWorkoutCompletionToFitness(
          eventId,
          userId,
          {
            calories,
            date: sessionDate,
            templateId: partial.extendedProps.workoutTemplate.id
          }
        )
      }
    } catch (error) {
      console.error('Failed to sync updated workout to fitness logs:', error)
    }

    // Sync to Google for selected targets
    try {
      const base = events.find(e => e.id === eventId)
      if (!base) return
      const next: CalendarEvent = {
        ...base,
        ...partial,
        extendedProps: { ...base.extendedProps, ...(partial.extendedProps || {}) }
      }
      const scheduleXEvent = {
        id: next.id,
        title: next.extendedProps?.kind === 'water'
          ? (next.extendedProps?.status === 'complete' ? 'Drink water ✓' : next.title || 'Drink water')
          : next.title,
        start: next.start,
        end: next.end,
        description: next.description || '',
        location: next.extendedProps?.location || '',
        attendees: next.extendedProps?.participants?.map(p => ({ email: p.email, name: p.name })) || [],
        kind: next.extendedProps?.kind
      }
      const gEvent = convertToGoogleEvent(scheduleXEvent)
      const selectedTargets = Array.isArray(next.targetAccountIds) && next.targetAccountIds.length > 0
        ? next.targetAccountIds
        : (() => {
            const fallback = resolveTargetAccountId(next)
            return fallback ? [fallback] : []
          })()
      if (!isGoogleCalendarConnected || selectedTargets.length === 0) return
      const linked = next.syncedGoogleEventIds || {}
      await Promise.all(selectedTargets.map(async targetId => {
        const linkedId = linked[targetId]
        if (linkedId) {
          await updateGoogleEvent(targetId, linkedId, gEvent)
        } else {
          const { id: createdId } = await createGoogleEvent(targetId, gEvent) as { id: string }
          setEvents(prev => prev.map(ev => ev.id === next.id ? ({
            ...ev,
            syncedGoogleEventIds: { ...(ev.syncedGoogleEventIds || {}), [targetId]: createdId }
          }) : ev))
          try {
            await supabase.from('workout_sessions')
              .update({ google_linked: { ...(next.syncedGoogleEventIds || {}), [targetId]: createdId } })
              .eq('id', next.id)
          } catch {
            // non-fatal
          }
        }
      }))
    } catch (e) {
      console.error('Failed to sync updated event to Google', e)
    }
  }

  // Delete event locally and in Google (for all linked accounts)
  const handleDeleteEvent = async (eventId: string) => {
    const existing = events.find(e => e.id === eventId)
    if (!existing) return
    if (existing.source === 'google') {
      // Do not delete Google-origin events from our UI
      return
    }

    // Remove locally first for snappy UX
    setEvents(prev => prev.filter(e => e.id !== eventId))

    try {
      // Delete from DB
      try {
        await supabase.from('workout_sessions').delete().eq('id', eventId)
      } catch {
        // non-fatal
      }
      if (!isGoogleCalendarConnected) return
      const linked = existing.syncedGoogleEventIds || {}
      const targetIds = Object.keys(linked)
      if (targetIds.length === 0) return
      await Promise.all(targetIds.map(async accountId => {
        const gId = linked[accountId]
        if (!gId) return
        try {
          await deleteGoogleEvent(accountId, gId)
        } catch (err) {
          console.warn('Failed to delete Google event for account', accountId, err)
        }
      }))
    } catch (e) {
      console.error('Failed to sync deletion to Google', e)
    }
  }

  const handleCloseDrawer = () => {
    clearPreviewBlock()
    setDrawerOpen(false)
    setSelectedEvent(null)
    setPrefillDates(null)
  }

  // Mobile dock integrations
  useEffect(() => {
    const onOpenFilters = () => setSidebarCollapsed(false)
    const onOpenAdd = () => handleAddEvent()
    const onOpenNutrition = () => {
      try {
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth() + 1).padStart(2, '0')
        const dd = String(today.getDate()).padStart(2, '0')
        setNutritionDrawerDate(`${yyyy}-${mm}-${dd}`)
      } catch { setNutritionDrawerDate(null) }
      setNutritionDrawerOpen(true)
    }
    try {
      if (typeof window !== 'undefined') {
        window.addEventListener('workout-plans:open-filters', onOpenFilters as EventListener)
        window.addEventListener('workout-plans:open-add', onOpenAdd as EventListener)
        window.addEventListener('workout-plans:open-nutrition', onOpenNutrition as EventListener)
      }
    } catch { /* noop */ }
    return () => {
      try {
        if (typeof window !== 'undefined') {
          window.removeEventListener('workout-plans:open-filters', onOpenFilters as EventListener)
          window.removeEventListener('workout-plans:open-add', onOpenAdd as EventListener)
          window.removeEventListener('workout-plans:open-nutrition', onOpenNutrition as EventListener)
        }
      } catch { /* noop */ }
    }
  }, [handleAddEvent])

  return (
    <div className="flex h-screen">
      {!hideSidebar && (
        <CalendarSidebar
          collapsed={sidebarCollapsed}
          accounts={googleCalendarAccounts.map(a => ({ id: a.id, email: a.email, name: (a.customName || a.name || null), color: a.color || null }))}
          visibleAccounts={visibleAccounts}
          setVisibleAccounts={(next) => setVisibleAccounts(next)}
          users={usersForFilter}
          selectedUserIds={selectedUserIds}
          setSelectedUserIds={setSelectedUserIds}
          spaces={spacesForFilter}
          selectedSpaceIds={selectedSpaceIds}
          setSelectedSpaceIds={setSelectedSpaceIds}
          showWater={showWater}
          setShowWater={setShowWater}
          showSleep={showSleep}
          setShowSleep={setShowSleep}
        />
      )}
      {!hideSidebar && !sidebarCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
          aria-hidden
        />
      )}

      <div className="flex-1 flex flex-col">
        {!hideHeader && (
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setSidebarCollapsed(v => !v)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Filter className="h-4 w-4" />
            </Button>
            <div className="text-sm text-muted-foreground">Workout Plans</div>
          </div>
          <div className="flex items-center gap-2">
            {googleCalendarError && (
              <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                Google Calendar Error
              </div>
            )}

            <Button
              onClick={() => {
                const base = ((process.env.NEXT_PUBLIC_BASE_URL as string) || '/').replace(/\/?$/, '/')
                if (typeof window !== 'undefined') {
                  window.location.href = `${base}account?tab=calendar`
                }
              }}
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={isGoogleCalendarLoading}
              title={isGoogleCalendarLoading ? 'Loading...' : isGoogleCalendarConnected ? 'Add account' : 'Connect'}
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
            <Button 
              onClick={handleAddEvent}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>
        </div>
        )}

        {/* Calendar */}
        <div 
          className="flex-1 min-h-0 sx-react-calendar-wrapper dark relative"
          ref={calendarRootRef}
        >


        <style jsx global>{`
          /* Custom styling for Schedule-X calendar components */

          /* Disable text selection for calendar interactions */
          .sx-react-calendar-wrapper {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
          }

          .sx__calendar {
            background-color: none !important;
            border: none !important;
            border-radius: 0 !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
          }

          .sx__view-container {
            position: relative !important;
            flex: 1 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            scroll-behavior: smooth !important;
            scrollbar-width: thin !important;
            scrollbar-color: hsl(var(--muted)) hsl(var(--background)) !important;
            height: 100% !important;
            max-height: 100% !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
          }

          /* Ensure the calendar wrapper allows proper height */
          .sx-react-calendar-wrapper {
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
          }

          /* Force Schedule-X calendar to use full height */
          .sx__calendar {
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
          }

          /* Ensure view container takes remaining space */
          .sx__view {
            flex: 1 !important;
            min-height: 0 !important;
            overflow: hidden !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
          }

          /* Calendar header content - our first custom component */
          .sx__calendar-header-content {
            display: flex;
            align-items: center;
            gap: 16px;
            background-color: hsl(var(--background));
            margin-bottom: 16px;
          }

          .sx__today-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            cursor: pointer;
            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          }

          /* Override ripple effect to be square instead of circular */
          .sx__ripple {
            border-radius: 6px !important;
            border: 1px solid rgba(255, 255, 255, 0.18) !important;
            padding: 8px 16px !important;
          }

          /* Forward/backward navigation container */
          .sx__forward-backward-navigation {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          /* Custom chevron wrapper sizing */
          .sx__chevron-wrapper {
            min-width: 24px !important;
            min-height: 24px !important;
            padding: 18px !important;
          }

          /* Range heading font styling */
          .sx__range-heading {
            font-family: inherit !important;
            font-size: 16px !important;
            font-weight: 600 !important;
            line-height: 1.5 !important;
            color: hsl(var(--foreground)) !important;
          }

          /* Date input styling */
          .sx__date-input {
            padding: 8px 12px !important;
            transition: all 0.2s ease !important;
            border: 1px solid rgba(255, 255, 255, 0.18) !important;
          }

          /* Date input*/
          .sx__date-input:hover {
            background-color: rgba(125, 125, 125, 0.18) !important;
            border-color: rgba(125, 125, 125, 0.18) !important;
          }

          .sx__date-picker-popup {
            padding: 8px !important;
            width: fit-content !important;
          }

          .sx__date-picker__month-view-header__month-year {
            font-size: 14px !important;
            font-weight: 600 !important;
            line-height: 1.5 !important;
            padding: 4px !important;
            transition: background-color 0.2s ease !important;
            border-radius: 6px !important;
            text-decoration: none !important;
          }

          .sx__date-picker__month-view-header__month-year:hover {
            background-color: rgba(125, 125, 125, 0.18) !important;
            padding: 8px 16px !important;
          }

          .sx__date-picker__day-name {
            font-size: 12px !important;
            font-weight: 600 !important;
            line-height: 1 !important;
            padding: 4px !important;
          }

          .sx__date-picker__day {
            font-size: 12px !important;
            font-weight: 400 !important;
            line-height: 1 !important;
            transition: all 0.2s ease !important;
            cursor: pointer !important;
          }

          .sx__date-picker__day:hover {
            background-color: rgba(115, 115, 115, 0.18) !important;
            border-radius: 6px !important;
          }

          .sx__date-picker__day--today {
            background-color:rgb(255, 255, 255) !important;
            color: rgb(0, 0, 0) !important;
            border-radius: 6px !important;
            font-weight: 600 !important;
          }

          .sx__date-picker__day--today:hover {
            background-color:rgb(255, 255, 255) !important;
          }
          
          .sx__date-picker__day--selected {
            background-color: rgba(255, 255, 255, 0.18) !important;
            color: rgb(255, 255, 255) !important;
            border-radius: 6px !important;
            font-weight: 600 !important;
          }

          .sx__date-picker__day--selected:hover {
            background-color: rgba(255, 255, 255, 0.25) !important;
          }

          .sx__week-grid__day-name {
            font-size: 12px !important;
            font-weight: 400 !important;
            line-height: 1 !important;
            padding-bottom: 4px !important;
          }

          .sx__week-grid__date-number {
            font-size: 14px !important;
            font-weight: 400 !important;
            line-height: 1 !important;
            border-radius: 6px !important;
          }

          /* Schedule-X View Selection Styling */
          .sx__view-selection {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            border: 1px solid rgba(115, 115, 115, 0.18) !important;
            border-radius: 6px !important;
            transition: all 0.2s ease !important;
          }

          .sx__view-selection:hover {
            background-color: rgba(115, 115, 115, 0.18) !important;
          }

          .sx__view-selection-selected-item {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 8px 12px !important;
            border-radius: 6px !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            color: rgb(255, 255, 255) !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            min-width: 100px !important;
          }


          .sx__view-selection-dropdown {
            position: absolute !important;
            top: 100% !important;
            left: 0 !important;
            right: 0 !important;
            background-color: hsl(var(--background)) !important;
            border: 1px solid hsl(var(--border)) !important;
            border-radius: 6px !important;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06) !important;
            z-index: 50 !important;
            margin-top: 4px !important;
          }

          .sx__view-selection-item {
            padding: 8px 12px !important;
            font-size: 14px !important;
            color: hsl(var(--foreground)) !important;
            cursor: pointer !important;
            transition: background-color 0.2s ease !important;
          }

          .sx__view-selection-item:hover {
            background-color: rgba(115, 115, 115, 0.18) !important;
          }

          .sx__view-selection-item:first-child {
            border-radius: 6px 6px 0 0 !important;
          }

          .sx__view-selection-item:last-child {
            border-radius: 0 0 6px 6px !important;
          }

          /* Additional text selection prevention for drag operations */
          .sx__time-grid,
          .sx__time-grid__day,
          .sx__time-grid__hour,
          .sx__time-grid__hour-label,
          .sx__time-grid__hour-content,
          .sx__month-grid,
          .sx__month-grid__day,
          .sx__month-grid__day-content,
          .sx__day-view,
          .sx__week-view,
          .sx__month-view {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
          }

          /* Prevent text selection on event elements */
          .sx__event,
          .sx__event__title,
          .sx__event__time {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
          }

          /* Add cursor pointer to events for clickability */
          .sx__event {
            cursor: pointer !important;
          }

          /* Ensure resize handles maintain their specific cursors */
          .sx__event__resize-handle {
            cursor: ns-resize !important;
          }

          .sx__event__resize-handle--start {
            cursor: ns-resize !important;
          }

          .sx__event__resize-handle--end {
            cursor: ns-resize !important;
          }

          /* Keep default cursor for time grid */
        
          
        `}</style>
          <ScheduleXCalendar calendarApp={calendar} />
        </div>

        {/* Event Drawer - slide up on mobile */}
        <div className={isMobile ? 'fixed inset-x-0 bottom-0 z-50' : ''}>
        <CalendarEventDrawer
          isOpen={drawerOpen}
          onClose={handleCloseDrawer}
          mode={drawerMode}
          event={selectedEvent || undefined}
          trainers={trainers}
          workoutSpaces={workoutSpaces}
          accounts={googleCalendarAccounts.map(a => ({ id: a.id, email: a.email, name: a.name, customName: a.customName || null }))}
          prefillDates={prefillDates || undefined}
          onCreateEvent={handleCreateEvent}
          onUpdateEvent={handleUpdateEvent}
          onUpdateAttendance={updateAttendance}
          onDeleteEvent={handleDeleteEvent}
        />
        </div>

        {/* Nutrition Drawer: slide up on mobile (Drawer), right side on desktop */}
        <Drawer open={nutritionDrawerOpen} onOpenChange={setNutritionDrawerOpen} direction={isMobile ? 'bottom' : 'right'}>
          <DrawerContent className={isMobile ? 'data-[vaul-drawer-direction=bottom]:!max-h-[90vh] overflow-y-auto' : 'overflow-y-auto'}>
            <DrawerHeader>
              <DrawerTitle>Meals for {nutritionDrawerDate || 'selected day'}</DrawerTitle>
              <DrawerDescription>
                No recipes added yet.
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 space-y-6">
              <div>
                <div className="text-sm font-medium mb-2">Water</div>
                {(() => {
                  const day = nutritionDrawerDate
                  const dayEvents = (events || []).filter(ev => ev.extendedProps?.kind === 'water' && (day ? ev.start?.startsWith(day) : false)).slice().sort((a, b) => a.start.localeCompare(b.start))
                  const hasPending = dayEvents.length > 0

                  const resetWaterEvents = async () => {
                    try {
                      if (!day) return
                      // Reset all water events for the day back to pending
                      const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:water_status_by_day') : null
                      const store = raw ? JSON.parse(raw) as Record<string, Record<string, 'pending'|'complete'|'missed'>> : {}
                      const dayMap = store[day] || {}
                      for (const eventId in dayMap) {
                        if (dayMap[eventId] === 'complete' || dayMap[eventId] === 'missed') {
                          dayMap[eventId] = 'pending'
                        }
                      }
                      store[day] = dayMap
                      localStorage.setItem('fitspo:water_status_by_day', JSON.stringify(store))

                      // Update events state to reset statuses
                      setEvents(prev => prev.map(e => {
                        if (e.extendedProps?.kind === 'water' && e.start?.startsWith(day)) {
                          return { ...e, extendedProps: { ...e.extendedProps, status: 'pending' } }
                        }
                        return e
                      }))

                      // Trigger refresh
                      window.dispatchEvent(new Event('fitspo:logs_changed'))
                    } catch {/* ignore */}
                  }

                  if (!hasPending) {
                    // All water events completed - show completed status with reset button
                    return (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="text-green-600 font-medium">✓ All water goals completed</div>
                        <Button size="sm" variant="outline" onClick={resetWaterEvents}>
                          Reset
                        </Button>
                      </div>
                    )
                  }

                  return (
                    <div className="flex items-center gap-2 text-sm">
                      <Button size="sm" variant="default" onClick={async () => {
                        try {
                          if (!day) return
                          const nearest = dayEvents[0]
                          if (!nearest) return
                          setEvents(prev => prev.map(e => e.id === nearest.id ? ({ ...e, extendedProps: { ...e.extendedProps, status: 'complete' } }) : e))
                          try {
                            const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:water_status_by_day') : null
                            const store = raw ? JSON.parse(raw) as Record<string, Record<string, 'pending'|'complete'|'missed'>> : {}
                            const dayMap = store[day] || {}
                            dayMap[nearest.id] = 'complete'
                            store[day] = dayMap
                            localStorage.setItem('fitspo:water_status_by_day', JSON.stringify(store))
                            const logRaw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:water_log_by_day') : null
                            const logStore = logRaw ? JSON.parse(logRaw) as Record<string, Array<{ id: string; start: string; end: string; status: 'complete'|'missed'; at: string }>> : {}
                            const list = logStore[day] || []
                            list.push({ id: nearest.id, start: nearest.start, end: nearest.end, status: 'complete', at: new Date().toISOString() })
                            logStore[day] = list
                            localStorage.setItem('fitspo:water_log_by_day', JSON.stringify(logStore))
                          } catch {/* ignore */}
                          try {
                            const userId = typeof window !== 'undefined' ? (localStorage.getItem('fitspo:selected_user_id') || '') : ''
                            if (userId) {
                              await supabase.from('hydration_logs').insert({
                                user_id: userId,
                                day,
                                event_id: nearest.id,
                                start_at: toIsoFromLocal(nearest.start),
                                end_at: toIsoFromLocal(nearest.end),
                                status: 'complete',
                                logged_at: new Date().toISOString()
                              })
                              setWaterLogsDbByDay(prev => ({
                                ...prev,
                                [day]: [
                                  ...((prev[day] as Array<{ id: string; start: string; end: string; status: 'complete'|'missed'; at: string }>) || []),
                                  { id: nearest.id, start: nearest.start, end: nearest.end, status: 'complete', at: new Date().toISOString() }
                                ]
                              }))
                            }
                          } catch { /* ignore */ }
                          // Mirror water confirmation into daily totals and active plan logs
                          try {
                            const dayKey = day
                            const inc = 0.5
                            const rawLit = typeof window !== 'undefined' ? localStorage.getItem('fitspo:water_liters_by_day') : null
                            const litersMap = rawLit ? JSON.parse(rawLit) as Record<string, number> : {}
                            litersMap[dayKey] = Math.max(0, Number(litersMap[dayKey] || 0) + inc)
                            localStorage.setItem('fitspo:water_liters_by_day', JSON.stringify(litersMap))
                            const rawPlans = typeof window !== 'undefined' ? localStorage.getItem('fitspo:plans') : null
                            if (rawPlans) {
                              const all = JSON.parse(rawPlans) as Record<string, Array<{ id: string; status: string }>>
                              const userId = typeof window !== 'undefined' ? (localStorage.getItem('fitspo:selected_user_id') || '') : ''
                              const list = all[userId] || []
                              const active = list.find(p => p.status === 'active')
                              if (active) {
                                const key = `fitspo:plan_logs:${active.id}`
                                const rawLog = localStorage.getItem(key)
                                const log = rawLog ? JSON.parse(rawLog) as Record<string, { date: string; water?: number; sleep?: number; food?: number; exercise?: number }> : {}
                                const cur = log[dayKey] || { date: dayKey }
                                const prev = Number(cur.water || 0)
                                log[dayKey] = { ...cur, water: Math.max(0, prev + inc) }
                                localStorage.setItem(key, JSON.stringify(log))
                              }
                            }
                            window.dispatchEvent(new Event('fitspo:logs_changed'))
                          } catch {/* ignore */}
                          void handleUpdateEvent(nearest.id, { extendedProps: { ...nearest.extendedProps, status: 'complete' } })
                          setEvents(prev => prev.filter(e => !(e.id === nearest.id)))
                        } catch {/* ignore */}
                      }}>Confirm next</Button>
                      <Button size="sm" variant="outline" onClick={async () => {
                        try {
                          if (!day) return
                          const nearest = dayEvents[0]
                          if (!nearest) return
                          setEvents(prev => prev.map(e => e.id === nearest.id ? ({ ...e, extendedProps: { ...e.extendedProps, status: 'missed' } }) : e))
                          try {
                            const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:water_status_by_day') : null
                            const store = raw ? JSON.parse(raw) as Record<string, Record<string, 'pending'|'complete'|'missed'>> : {}
                            const dayMap = store[day] || {}
                            dayMap[nearest.id] = 'missed'
                            store[day] = dayMap
                            localStorage.setItem('fitspo:water_status_by_day', JSON.stringify(store))
                            const logRaw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:water_log_by_day') : null
                            const logStore = logRaw ? JSON.parse(logRaw) as Record<string, Array<{ id: string; start: string; end: string; status: 'complete'|'missed'; at: string }>> : {}
                            const list = logStore[day] || []
                            list.push({ id: nearest.id, start: nearest.start, end: nearest.end, status: 'missed', at: new Date().toISOString() })
                            logStore[day] = list
                            localStorage.setItem('fitspo:water_log_by_day', JSON.stringify(logStore))
                          } catch {/* ignore */}
                          try {
                            const userId = typeof window !== 'undefined' ? (localStorage.getItem('fitspo:selected_user_id') || '') : ''
                            if (userId) {
                              await supabase.from('hydration_logs').insert({
                                user_id: userId,
                                day,
                                event_id: nearest.id,
                                start_at: toIsoFromLocal(nearest.start),
                                end_at: toIsoFromLocal(nearest.end),
                                status: 'missed',
                                logged_at: new Date().toISOString()
                              })
                              setWaterLogsDbByDay(prev => ({
                                ...prev,
                                [day]: [
                                  ...((prev[day] as Array<{ id: string; start: string; end: string; status: 'complete'|'missed'; at: string }>) || []),
                                  { id: nearest.id, start: nearest.start, end: nearest.end, status: 'missed', at: new Date().toISOString() }
                                ]
                              }))
                            }
                          } catch { /* ignore */ }
                          void handleUpdateEvent(nearest.id, { extendedProps: { ...nearest.extendedProps, status: 'missed' } })
                        } catch {/* ignore */}
                      }}>Skip next</Button>
                    </div>
                  )
                })()}
                {/* Water log for the selected day (local + Supabase, deduped) */}
                {nutritionDrawerDate && nutritionVersion >= 0 && (
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="text-xs font-medium">Water log</div>
                    {(() => {
                      try {
                        const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:water_log_by_day') : null
                        const store = raw ? JSON.parse(raw) as Record<string, Array<{ id: string; start: string; end: string; status: 'complete'|'missed'; at: string }>> : {}
                        const localList = store[nutritionDrawerDate] || []
                        const dbList = (waterLogsDbByDay[nutritionDrawerDate] || [])
                        const byId: Record<string, { id: string; start: string; end: string; status: 'complete'|'missed'; at: string }> = {}
                        for (const it of dbList) { byId[it.id] = it }
                        for (const it of localList) { if (!byId[it.id]) byId[it.id] = it }
                        const merged = Object.values(byId)
                        if (merged.length === 0) return <div className="text-muted-foreground">No water activity yet.</div>
                        return (
                          <div className="space-y-1">
                            {merged
                              .slice()
                              .sort((a, b) => a.start.localeCompare(b.start))
                              .map((it) => (
                                <div key={`${it.id}`} className="flex items-center justify-between border rounded px-2 py-1">
                                  <span>{it.start.slice(11,16)} → {it.end.slice(11,16)}</span>
                                  <span className={it.status === 'complete' ? 'text-emerald-400' : 'text-amber-400'}>{it.status}</span>
                                </div>
                              ))}
                          </div>
                        )
                      } catch {
                        return <div className="text-muted-foreground">No water activity yet.</div>
                      }
                    })()}
                  </div>
                )}
              </div>

              {/* Meals Section with RecipeCards styling */}
              <div>
                <div className="text-sm font-medium mb-3">Meals</div>

                {/* Complete All / Missed All / Pending buttons */}
                <div className="flex items-center gap-2 text-sm mb-4">
                  <Button size="sm" variant={(() => { try { const day = nutritionDrawerDate; if (!day) return 'outline'; const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:food_status_by_day') : null; const map = raw ? JSON.parse(raw) as Record<string,'pending'|'complete'|'missed'> : {}; const s = map[day] || 'pending'; return s==='complete' ? 'default' : 'outline'; } catch { return 'outline' }})()} onClick={() => {
                    try {
                      const day = nutritionDrawerDate
                      if (!day) return
                      const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:food_status_by_day') : null
                      const map = raw ? JSON.parse(raw) as Record<string, 'pending' | 'complete' | 'missed'> : {}
                      map[day] = 'complete'
                      localStorage.setItem('fitspo:food_status_by_day', JSON.stringify(map))
                      try { window.dispatchEvent(new Event('fitspo:logs_changed')) } catch { /* ignore */ }
                    } catch {/* ignore */}
                  }}>Complete All</Button>
                  <Button size="sm" variant={(() => { try { const day = nutritionDrawerDate; if (!day) return 'outline'; const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:food_status_by_day') : null; const map = raw ? JSON.parse(raw) as Record<string,'pending'|'complete'|'missed'> : {}; const s = map[day] || 'pending'; return s==='missed' ? 'default' : 'outline'; } catch { return 'outline' }})()} onClick={() => {
                    try {
                      const day = nutritionDrawerDate
                      if (!day) return
                      const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:food_status_by_day') : null
                      const map = raw ? JSON.parse(raw) as Record<string, 'pending' | 'complete' | 'missed'> : {}
                      map[day] = 'missed'
                      localStorage.setItem('fitspo:food_status_by_day', JSON.stringify(map))
                      try { window.dispatchEvent(new Event('fitspo:logs_changed')) } catch { /* ignore */ }
                    } catch {/* ignore */}
                  }}>Missed All</Button>
                  <Button size="sm" variant={(() => { try { const day = nutritionDrawerDate; if (!day) return 'outline'; const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:food_status_by_day') : null; const map = raw ? JSON.parse(raw) as Record<string,'pending'|'complete'|'missed'> : {}; const s = map[day] || 'pending'; return s==='pending' ? 'default' : 'outline'; } catch { return 'outline' }})()} onClick={() => {
                    try {
                      const day = nutritionDrawerDate
                      if (!day) return
                      const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:food_status_by_day') : null
                      const map = raw ? JSON.parse(raw) as Record<string, 'pending' | 'complete' | 'missed'> : {}
                      map[day] = 'pending'
                      localStorage.setItem('fitspo:food_status_by_day', JSON.stringify(map))
                      try { window.dispatchEvent(new Event('fitspo:logs_changed')) } catch { /* ignore */ }
                    } catch {/* ignore */}
                  }}>Pending</Button>
                </div>

                {/* Planned Recipes Grid */}
                {nutritionDrawerDate && nutritionVersion >= 0 && (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">Planned recipes</div>
                    {(() => {
                      try {
                        const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:recipes_by_day') : null
                        const map = raw ? JSON.parse(raw) as Record<string, Array<{ id: string; name: string; pax: number; kcals: number; addedAt: string; status?: 'pending'|'complete'|'missed' }>> : {}
                        const listRaw = Array.isArray(map[nutritionDrawerDate]) ? map[nutritionDrawerDate] : []
                        const list = listRaw.filter(it => it.status !== 'complete')

                        if (list.length === 0) {
                          return (
                            <div className="text-center py-8 text-muted-foreground">
                              <div className="text-sm">No recipes scheduled for today.</div>
                              <div className="text-xs mt-1">Add recipes using the button below.</div>
                            </div>
                          )
                        }

                        // Build inventory by food name from foods + remote inventory
                        const idToName = new Map<string, string>()
                        for (const f of foodsForMeals) idToName.set(f.id, f.name)
                        const invByName = new Map<string, Ingredient>()
                        for (const f of foodsForMeals) {
                          const amt = remoteInvForMeals[f.id] || 0
                          const ing: Ingredient = {
                            id: `food:${f.id}`,
                            name: f.name,
                            available: { amount: 0, unit: 'g' },
                            stdGramsOrMl: Number(amt) || 0,
                            pricePerBase: 0,
                            nutrientsPer100: {
                              macros: {
                                carbs: f.carbs_per_100 || 0,
                                fats: f.fats_per_100 || 0,
                                protein: f.protein_per_100 || 0
                              },
                              micros: f.micros || {}
                            },
                            category: f.category || undefined
                          }
                          invByName.set(f.name, ing)
                        }

                        const handleRecipeStatusChange = (idx: number, status: 'pending'|'complete'|'missed') => {
                          try {
                            const raw2 = typeof window !== 'undefined' ? localStorage.getItem('fitspo:recipes_by_day') : null
                            const byDay2: Record<string, Array<{ id: string; name: string; pax: number; kcals: number; addedAt: string; status?: 'pending'|'complete'|'missed' }>> = raw2 ? JSON.parse(raw2) : {}
                            const full = Array.isArray(byDay2[nutritionDrawerDate]) ? byDay2[nutritionDrawerDate] : []

                            // Find the recipe in the full list (not just the filtered list)
                            const targetRecipe = list[idx]
                            if (!targetRecipe) return

                            const origIndex = full.findIndex(item => item.id === targetRecipe.id && item.addedAt === targetRecipe.addedAt)
                            if (origIndex >= 0) {
                              full[origIndex].status = status
                              byDay2[nutritionDrawerDate] = full
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('fitspo:recipes_by_day', JSON.stringify(byDay2))
                                // Trigger re-render by updating nutrition version
                                setNutritionVersion(prev => prev + 1)
                                window.dispatchEvent(new Event('fitspo:logs_changed'))
                              }
                            }
                          } catch (error) {
                            console.error('Error updating recipe status:', error)
                          }
                        }

                        const handleRemoveRecipe = (idx: number) => {
                          try {
                            const raw2 = typeof window !== 'undefined' ? localStorage.getItem('fitspo:recipes_by_day') : null
                            const byDay2: Record<string, Array<{ id: string; name: string; pax: number; kcals: number; addedAt: string; status?: 'pending'|'complete'|'missed' }>> = raw2 ? JSON.parse(raw2) : {}
                            const full = Array.isArray(byDay2[nutritionDrawerDate]) ? byDay2[nutritionDrawerDate] : []

                            // Find the recipe in the full list (not just the filtered list)
                            const targetRecipe = list[idx]
                            if (!targetRecipe) return

                            const origIndex = full.findIndex(item => item.id === targetRecipe.id && item.addedAt === targetRecipe.addedAt)
                            if (origIndex >= 0) {
                              full.splice(origIndex, 1)
                              byDay2[nutritionDrawerDate] = full
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('fitspo:recipes_by_day', JSON.stringify(byDay2))
                                // Trigger re-render by updating nutrition version
                                setNutritionVersion(prev => prev + 1)
                                window.dispatchEvent(new Event('fitspo:logs_changed'))
                              }
                            }
                          } catch (error) {
                            console.error('Error removing recipe:', error)
                          }
                        }

                        return (
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {list.map((it, idx) => {
                              const recipe = HEALTHY_RECIPES.find(r => r.id === it.id) || { id: it.id, name: it.name, baseServings: it.pax || 1, category: 'Dinner' as const, diets: [], ingredients: [] }
                              let res: { perPerson?: { macros?: { carbs: number; protein: number; fats: number } } } | null = null
                              try { res = calculateRecipeForPax(recipe, it.pax || 1, invByName) } catch { res = null }
                              const macros = res?.perPerson?.macros
                              const data = macros ? [
                                { name: 'Carbs', value: Math.round(macros.carbs) },
                                { name: 'Protein', value: Math.round(macros.protein) },
                                { name: 'Fats', value: Math.round(macros.fats) }
                              ] : []

                              let feas: { canMake: boolean } = { canMake: true }
                              try { feas = feasibilityForRecipe(recipe, it.pax || 1, invByName) } catch { /* ignore */ }

                              // Create gradient for macro chart
                              const gradId = `macroGradient-${it.id}-${idx}`

                              return (
                                <Card key={`${it.id}-${idx}-${it.addedAt}`} className={`p-4 flex flex-col gap-4 border transition-all hover:shadow-md ${!feas.canMake ? 'opacity-60 border-amber-200' : 'border-border'}`}>
                                  {/* Header with name and pax */}
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-sm truncate">{it.name}</div>
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        {recipe.category || 'Meal'}
                                        {Array.isArray(recipe.diets) && recipe.diets.length > 0 && (
                                          <> • {recipe.diets.slice(0, 2).join(', ')}</>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
                                      <div className="text-xs bg-muted px-2 py-1 rounded-md font-medium">
                                        {it.pax} pax
                                      </div>
                                    </div>
                                  </div>

                                  {/* Nutrition info */}
                                  {res && res.perPerson && res.perPerson.macros && (
                                    <div className="space-y-3">
                                      {/* Per person stats */}
                                      <div className="flex flex-wrap gap-2 items-center text-xs">
                                        <span className="text-muted-foreground">Per person:</span>
                                        <span className="px-2 py-1 rounded border bg-muted/50 font-medium">
                                          {Math.round((res.perPerson as any).calories || 0)} kcal
                                        </span>
                                        <span className="px-2 py-1 rounded border bg-muted/50 font-medium">
                                          C {Math.round(res.perPerson.macros.carbs)}g
                                        </span>
                                        <span className="px-2 py-1 rounded border bg-muted/50 font-medium">
                                          P {Math.round(res.perPerson.macros.protein)}g
                                        </span>
                                        <span className="px-2 py-1 rounded border bg-muted/50 font-medium">
                                          F {Math.round(res.perPerson.macros.fats)}g
                                        </span>
                                      </div>

                                      {/* Macro chart */}
                                      <div className="w-full">
                                        <ChartContainer config={{ value: { label: 'g' } }} className="w-full h-20">
                                          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                            <defs>
                                              <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="33%" stopColor="#ef4444" />
                                                <stop offset="66%" stopColor="#8b5cf6" />
                                                <stop offset="100%" stopColor="#10b981" />
                                              </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" tickLine={false} axisLine={false} tickMargin={0} domain={[0, 'dataMax']} />
                                            <YAxis type="category" dataKey="name" mirror tickLine={false} axisLine={false} tickMargin={0} width={0} />
                                            <Bar dataKey="value" fill={`url(#${gradId})`} radius={2} />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                          </BarChart>
                                        </ChartContainer>
                                      </div>
                                    </div>
                                  )}

                                  {/* Status and action buttons */}
                                  <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t">
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        variant={it.status === 'complete' ? 'default' : 'outline'}
                                        onClick={() => handleRecipeStatusChange(idx, 'complete')}
                                        className="text-xs h-7 px-2"
                                      >
                                        ✓ Complete
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant={it.status === 'missed' ? 'default' : 'outline'}
                                        onClick={() => handleRecipeStatusChange(idx, 'missed')}
                                        className="text-xs h-7 px-2"
                                      >
                                        ✗ Missed
                                      </Button>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleRemoveRecipe(idx)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </Card>
                              )
                            })}
                          </div>
                        )
                      } catch (error) {
                        console.error('Error rendering recipes:', error)
                        return (
                          <div className="text-center py-8 text-muted-foreground">
                            <div className="text-sm">Unable to load recipes.</div>
                          </div>
                        )
                      }
                    })()}
                  </div>
                )}
              </div>

              <Button onClick={() => {
                const base = ((process.env.NEXT_PUBLIC_BASE_URL as string) || '/').replace(/\/?$/, '/')
                if (typeof window !== 'undefined') {
                  window.location.href = `${base}plans/nutrition`
                }
              }} className="bg-primary hover:bg-primary/90">
                Add recipes
              </Button>
            </div>
          </DrawerContent>
        </Drawer>

        {isMobile ? (
          <Drawer open={sleepDrawerOpen} onOpenChange={setSleepDrawerOpen} direction="bottom">
            <DrawerContent className="data-[vaul-drawer-direction=bottom]:!max-h-[90vh] overflow-y-auto">
              <DrawerHeader>
                <DrawerTitle>Sleep for {sleepDrawerDate || 'selected day'}</DrawerTitle>
                <DrawerDescription>
                  Edit sleep hours for this day.
                </DrawerDescription>
              </DrawerHeader>
            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Start</div>
                  <input type="time" value={sleepStartInput} onChange={(e) => setSleepStartInput(e.target.value)} className="h-9 w-full rounded border bg-background px-2" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">End</div>
                  <input type="time" value={sleepEndInput} onChange={(e) => setSleepEndInput(e.target.value)} className="h-9 w-full rounded border bg-background px-2" />
                </div>
              </div>
              {/* Sleep status controls */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={(() => { try { const day = sleepDrawerDate; if (!day) return 'outline'; const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:sleep_status_by_day') : null; const map = raw ? JSON.parse(raw) as Record<string,'pending'|'complete'|'missed'> : {}; const s = map[day] || 'pending'; return s==='complete' ? 'default' : 'outline'; } catch { return 'outline' }})()} onClick={async () => {
                    try {
                      const day = sleepDrawerDate
                      if (!day) return
                      // Update local storage
                      const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:sleep_status_by_day') : null
                      const map = raw ? JSON.parse(raw) as Record<string,'pending'|'complete'|'missed'> : {}
                      map[day] = 'complete'
                      if (typeof window !== 'undefined') localStorage.setItem('fitspo:sleep_status_by_day', JSON.stringify(map))
                      // Update event in state
                      const ev = eventsRef.current.find(ev => ev.extendedProps?.kind === 'sleep' && ev.start?.startsWith(day))
                      if (ev) {
                        setEvents(prev => prev.filter(e => e.id !== ev.id))
                        void handleUpdateEvent(ev.id, { extendedProps: { ...ev.extendedProps, status: 'complete' } })
                      }
                    } catch { /* ignore */ }
                  }}>Complete</Button>
                  <Button size="sm" variant={(() => { try { const day = sleepDrawerDate; if (!day) return 'outline'; const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:sleep_status_by_day') : null; const map = raw ? JSON.parse(raw) as Record<string,'pending'|'complete'|'missed'> : {}; const s = map[day] || 'pending'; return s==='missed' ? 'default' : 'outline'; } catch { return 'outline' }})()} onClick={async () => {
                    try {
                      const day = sleepDrawerDate
                      if (!day) return
                      const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:sleep_status_by_day') : null
                      const map = raw ? JSON.parse(raw) as Record<string,'pending'|'complete'|'missed'> : {}
                      map[day] = 'missed'
                      if (typeof window !== 'undefined') localStorage.setItem('fitspo:sleep_status_by_day', JSON.stringify(map))
                      const ev = eventsRef.current.find(ev => ev.extendedProps?.kind === 'sleep' && ev.start?.startsWith(day))
                      if (ev) {
                        setEvents(prev => prev.map(e => e.id === ev.id ? ({ ...e, extendedProps: { ...e.extendedProps, status: 'missed' } }) : e))
                        void handleUpdateEvent(ev.id, { extendedProps: { ...ev.extendedProps, status: 'missed' } })
                      }
                    } catch { /* ignore */ }
                  }}>Missed</Button>
                  <Button size="sm" variant={(() => { try { const day = sleepDrawerDate; if (!day) return 'default'; const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:sleep_status_by_day') : null; const map = raw ? JSON.parse(raw) as Record<string,'pending'|'complete'|'missed'> : {}; const s = map[day] || 'pending'; return s==='pending' ? 'default' : 'outline'; } catch { return 'default' }})()} onClick={async () => {
                    try {
                      const day = sleepDrawerDate
                      if (!day) return
                      const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:sleep_status_by_day') : null
                      const map = raw ? JSON.parse(raw) as Record<string,'pending'|'complete'|'missed'> : {}
                      map[day] = 'pending'
                      if (typeof window !== 'undefined') localStorage.setItem('fitspo:sleep_status_by_day', JSON.stringify(map))
                      const ev = eventsRef.current.find(ev => ev.extendedProps?.kind === 'sleep' && ev.start?.startsWith(day))
                      if (ev) {
                        setEvents(prev => prev.map(e => e.id === ev.id ? ({ ...e, extendedProps: { ...e.extendedProps, status: 'pending' } }) : e))
                        void handleUpdateEvent(ev.id, { extendedProps: { ...ev.extendedProps, status: 'pending' } })
                      }
                    } catch { /* ignore */ }
                  }}>Pending</Button>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={async () => {
                  // Update plan default sleep times in localStorage and Supabase, then refresh injected events
                  let updatedPlanId: string | null = null
                  try {
                    const userId = typeof window !== 'undefined' ? (localStorage.getItem('fitspo:selected_user_id') || '') : ''
                    const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:plans') : null
                    if (userId && raw) {
                      type AnyPlan = { id?: string; config?: { sleep?: { startTime?: string; endTime?: string } } }
                      const all = JSON.parse(raw) as Record<string, Array<AnyPlan>>
                      const list = all[userId] || []
                      if (list.length > 0) {
                        const first = { ...list[0] }
                        updatedPlanId = (first.id as string) || null
                        first.config = first.config || {}
                        first.config.sleep = { ...(first.config.sleep || {}), startTime: sleepStartInput, endTime: sleepEndInput }
                        all[userId] = [first, ...list.slice(1)]
                        localStorage.setItem('fitspo:plans', JSON.stringify(all))
                        window.dispatchEvent(new Event('fitspo:plans_changed'))
                      }
                    }
                  } catch {/* ignore */}
                  try {
                    if (updatedPlanId) {
                      await supabase.from('fitness_plans').update({
                        config: { sleep: { startTime: sleepStartInput, endTime: sleepEndInput } }
                      }).eq('id', updatedPlanId)
                    }
                  } catch {/* ignore */}
                  try {
                    // Mirror sleep hours into daily totals and active plan log
                    const day = sleepDrawerDate || new Date().toISOString().slice(0,10)
                    const s = sleepStartInput
                    const e = sleepEndInput
                    const [sh, sm] = s.split(':').map(Number)
                    const [eh, em] = e.split(':').map(Number)
                    let hrs = (eh + (eh < sh ? 24 : 0)) - sh + (em - sm)/60
                    if (!Number.isFinite(hrs)) hrs = 0
                    const rawM = typeof window !== 'undefined' ? localStorage.getItem('fitspo:sleep_hours_by_day') : null
                    const mapM: Record<string, number> = rawM ? JSON.parse(rawM) : {}
                    mapM[day] = Math.max(0, Math.round(hrs * 10)/10)
                    localStorage.setItem('fitspo:sleep_hours_by_day', JSON.stringify(mapM))
                    const rawPlans = typeof window !== 'undefined' ? localStorage.getItem('fitspo:plans') : null
                    if (rawPlans) {
                      const all = JSON.parse(rawPlans) as Record<string, Array<{ id: string; status: string }>>
                      const userId = typeof window !== 'undefined' ? (localStorage.getItem('fitspo:selected_user_id') || '') : ''
                      const list = all[userId] || []
                      const active = list.find(p => p.status === 'active')
                      if (active) {
                        const key = `fitspo:plan_logs:${active.id}`
                        const rawLog = localStorage.getItem(key)
                        const log = rawLog ? JSON.parse(rawLog) as Record<string, { date: string; water?: number; sleep?: number; food?: number; exercise?: number }> : {}
                        const cur = log[day] || { date: day }
                        log[day] = { ...cur, sleep: Math.max(0, Math.round(hrs * 10)/10) }
                        localStorage.setItem(key, JSON.stringify(log))
                      }
                    }
                    window.dispatchEvent(new Event('fitspo:logs_changed'))
                  } catch {/* ignore */}
                  setSleepDrawerOpen(false)
                }}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setSleepDrawerOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
        ) : (
          <Sheet open={sleepDrawerOpen} onOpenChange={setSleepDrawerOpen}>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Sleep for {sleepDrawerDate || 'selected day'}</SheetTitle>
              <SheetDescription>
                Edit sleep hours for this day.
              </SheetDescription>
            </SheetHeader>
            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Start</div>
                  <input type="time" value={sleepStartInput} onChange={(e) => setSleepStartInput(e.target.value)} className="h-9 w-full rounded border bg-background px-2" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">End</div>
                  <input type="time" value={sleepEndInput} onChange={(e) => setSleepEndInput(e.target.value)} className="h-9 w-full rounded border bg-background px-2" />
                </div>
              </div>
              {/* Sleep status controls */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={(() => { try { const day = sleepDrawerDate; if (!day) return 'outline'; const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:sleep_status_by_day') : null; const map = raw ? JSON.parse(raw) as Record<string,'pending'|'complete'|'missed'> : {}; const s = map[day] || 'pending'; return s==='complete' ? 'default' : 'outline'; } catch { return 'outline' }})()} onClick={async () => {
                    try {
                      const day = sleepDrawerDate
                      if (!day) return
                      // Update local storage
                      const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:sleep_status_by_day') : null
                      const map = raw ? JSON.parse(raw) as Record<string,'pending'|'complete'|'missed'> : {}
                      map[day] = 'complete'
                      if (typeof window !== 'undefined') localStorage.setItem('fitspo:sleep_status_by_day', JSON.stringify(map))
                      // Update event in state
                      const ev = eventsRef.current.find(ev => ev.extendedProps?.kind === 'sleep' && ev.start?.startsWith(day))
                      if (ev) {
                        setEvents(prev => prev.filter(e => e.id !== ev.id))
                        void handleUpdateEvent(ev.id, { extendedProps: { ...ev.extendedProps, status: 'complete' } })
                      }
                    } catch { /* ignore */ }
                  }}>Complete</Button>
                  <Button size="sm" variant={(() => { try { const day = sleepDrawerDate; if (!day) return 'outline'; const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:sleep_status_by_day') : null; const map = raw ? JSON.parse(raw) as Record<string,'pending'|'complete'|'missed'> : {}; const s = map[day] || 'pending'; return s==='missed' ? 'default' : 'outline'; } catch { return 'outline' }})()} onClick={async () => {
                    try {
                      const day = sleepDrawerDate
                      if (!day) return
                      const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:sleep_status_by_day') : null
                      const map = raw ? JSON.parse(raw) as Record<string,'pending'|'complete'|'missed'> : {}
                      map[day] = 'missed'
                      if (typeof window !== 'undefined') localStorage.setItem('fitspo:sleep_status_by_day', JSON.stringify(map))
                      const ev = eventsRef.current.find(ev => ev.extendedProps?.kind === 'sleep' && ev.start?.startsWith(day))
                      if (ev) {
                        setEvents(prev => prev.map(e => e.id === ev.id ? ({ ...e, extendedProps: { ...e.extendedProps, status: 'missed' } }) : e))
                        void handleUpdateEvent(ev.id, { extendedProps: { ...ev.extendedProps, status: 'missed' } })
                      }
                    } catch { /* ignore */ }
                  }}>Missed</Button>
                  <Button size="sm" variant={(() => { try { const day = sleepDrawerDate; if (!day) return 'default'; const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:sleep_status_by_day') : null; const map = raw ? JSON.parse(raw) as Record<string,'pending'|'complete'|'missed'> : {}; const s = map[day] || 'pending'; return s==='pending' ? 'default' : 'outline'; } catch { return 'default' }})()} onClick={async () => {
                    try {
                      const day = sleepDrawerDate
                      if (!day) return
                      const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:sleep_status_by_day') : null
                      const map = raw ? JSON.parse(raw) as Record<string,'pending'|'complete'|'missed'> : {}
                      map[day] = 'pending'
                      if (typeof window !== 'undefined') localStorage.setItem('fitspo:sleep_status_by_day', JSON.stringify(map))
                      const ev = eventsRef.current.find(ev => ev.extendedProps?.kind === 'sleep' && ev.start?.startsWith(day))
                      if (ev) {
                        setEvents(prev => prev.map(e => e.id === ev.id ? ({ ...e, extendedProps: { ...e.extendedProps, status: 'pending' } }) : e))
                        void handleUpdateEvent(ev.id, { extendedProps: { ...ev.extendedProps, status: 'pending' } })
                      }
                    } catch { /* ignore */ }
                  }}>Pending</Button>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={async () => {
                  // Update plan default sleep times in localStorage and Supabase, then refresh injected events
                  let updatedPlanId: string | null = null
                  try {
                    const userId = typeof window !== 'undefined' ? (localStorage.getItem('fitspo:selected_user_id') || '') : ''
                    const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:plans') : null
                    if (userId && raw) {
                      type AnyPlan = { id?: string; config?: { sleep?: { startTime?: string; endTime?: string } } }
                      const all = JSON.parse(raw) as Record<string, Array<AnyPlan>>
                      const list = all[userId] || []
                      if (list.length > 0) {
                        const first = { ...list[0] }
                        updatedPlanId = (first.id as string) || null
                        first.config = first.config || {}
                        first.config.sleep = { ...(first.config.sleep || {}), startTime: sleepStartInput, endTime: sleepEndInput }
                        all[userId] = [first, ...list.slice(1)]
                        localStorage.setItem('fitspo:plans', JSON.stringify(all))
                        window.dispatchEvent(new Event('fitspo:plans_changed'))
                      }
                    }
                  } catch {/* ignore */}
                  try {
                    if (updatedPlanId) {
                      await supabase.from('fitness_plans').update({
                        config: { sleep: { startTime: sleepStartInput, endTime: sleepEndInput } }
                      }).eq('id', updatedPlanId)
                    }
                  } catch {/* ignore */}
                  try {
                    // Mirror sleep hours into daily totals and active plan log
                    const day = sleepDrawerDate || new Date().toISOString().slice(0,10)
                    const s = sleepStartInput
                    const e = sleepEndInput
                    const [sh, sm] = s.split(':').map(Number)
                    const [eh, em] = e.split(':').map(Number)
                    let hrs = (eh + (eh < sh ? 24 : 0)) - sh + (em - sm)/60
                    if (!Number.isFinite(hrs)) hrs = 0
                    const rawM = typeof window !== 'undefined' ? localStorage.getItem('fitspo:sleep_hours_by_day') : null
                    const mapM: Record<string, number> = rawM ? JSON.parse(rawM) : {}
                    mapM[day] = Math.max(0, Math.round(hrs * 10)/10)
                    localStorage.setItem('fitspo:sleep_hours_by_day', JSON.stringify(mapM))
                    const rawPlans = typeof window !== 'undefined' ? localStorage.getItem('fitspo:plans') : null
                    if (rawPlans) {
                      const all = JSON.parse(rawPlans) as Record<string, Array<{ id: string; status: string }>>
                      const userId = typeof window !== 'undefined' ? (localStorage.getItem('fitspo:selected_user_id') || '') : ''
                      const list = all[userId] || []
                      const active = list.find(p => p.status === 'active')
                      if (active) {
                        const key = `fitspo:plan_logs:${active.id}`
                        const rawLog = localStorage.getItem(key)
                        const log = rawLog ? JSON.parse(rawLog) as Record<string, { date: string; water?: number; sleep?: number; food?: number; exercise?: number }> : {}
                        const cur = log[day] || { date: day }
                        log[day] = { ...cur, sleep: Math.max(0, Math.round(hrs * 10)/10) }
                        localStorage.setItem(key, JSON.stringify(log))
                      }
                    }
                    window.dispatchEvent(new Event('fitspo:logs_changed'))
                  } catch {/* ignore */}
                  setSleepDrawerOpen(false)
                }}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setSleepDrawerOpen(false)}>Cancel</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        )}
      </div>
    </div>
  )
}

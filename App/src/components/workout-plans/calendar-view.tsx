"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Calendar as CalendarIcon, PanelLeft, PanelRight } from 'lucide-react'

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

import { CalendarEventDrawer } from './calendar-event-drawer'
import { CalendarSidebar } from './calendar-sidebar'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { supabase } from '@/lib/supabaseClient'

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
  }
}

export function CalendarView() {
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


  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'view' | 'create' | 'edit'>('view')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [prefillDates, setPrefillDates] = useState<{ start: string; end: string } | null>(null)
  const previewEventIdRef = useRef<string | null>(null)

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
          // Keep any Google events already in memory; replace platform set with DB sessions
          const googleOnly = prev.filter(e => e.source === 'google')
          return [...platformFromDb, ...googleOnly]
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

      const reconstructedPlatformEvents: CalendarEvent[] = Array.from(platformGroups.values()).map(group => ({
        ...group.base,
        syncedGoogleEventIds: { ...(group.base.syncedGoogleEventIds || {}), ...group.linked },
        targetAccountIds: Object.keys(group.linked)
      }))

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
        // Prefer explicit workoutSpaceId if present
        const evSpaceId = (ev as { workoutSpaceId?: string }).workoutSpaceId
        if (evSpaceId) return selectedSpaces.has(evSpaceId)
        // Fallback: match by location name
        const loc = ev?.extendedProps?.location || ''
        return Array.from(selectedSpaces).some(spaceId => {
          const ws = workoutSpaces.find(ws => ws.id === spaceId)
          return ws ? loc === ws.name : false
        })
      })
    }
    return out
  }, [events, selectedUserIds, selectedSpaceIds, workoutSpaces])

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
            attendees: existing.extendedProps?.participants?.map(p => ({ email: p.email, name: p.name })) || []
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
  }, [eventsService, clearPreviewBlock])

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
          if (ev.source !== 'google') return
          const el = document.querySelector(`[data-event-id="${ev.id}"]`) as HTMLElement | null
          if (!el) return
          if (ev.backgroundColor) el.style.backgroundColor = ev.backgroundColor
          if (ev.borderColor) {
            el.style.setProperty('border-inline-start-color', ev.borderColor)
            el.style.borderColor = ev.borderColor
          }
          // Text color: white (or 10% white when hidden)
          const acc = accountsRef.current.find(a => a.id === ev.accountId)
          const textColor = acc?.hideDetails ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,1)'
          el.style.color = textColor
          // Override common Schedule-X on-container text vars used in templates
          el.style.setProperty('--sx-color-on-blue-container', textColor)
          el.style.setProperty('--sx-color-on-primary-container', textColor)
        })
      } catch {
        // noop
      }
    }
    const raf = requestAnimationFrame(() => {
      applyColors()
      setTimeout(applyColors, 0)
    })
    return () => cancelAnimationFrame(raf)
  }, [visibleEvents])

  // Re-apply colors whenever Schedule-X re-renders DOM (view change, navigation)
  useEffect(() => {
    const root = calendarRootRef.current
    if (!root) return
    const observer = new MutationObserver(() => {
      try {
        const current = eventsRef.current
        current.forEach(ev => {
          if (ev.source !== 'google') return
          const el = root.querySelector(`[data-event-id="${ev.id}"]`) as HTMLElement | null
          if (!el) return
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
        })
      } catch {
        // noop
      }
    })
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
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
    } catch (e) {
      console.error('Failed to persist workout session', e)
      // Fallback to local insert to avoid UX loss
      setEvents(prev => [...prev, platformEvent])
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
          attendees: platformEvent.extendedProps?.participants?.map(p => ({ email: p.email, name: p.name })) || []
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
        title: next.title,
        start: next.start,
        end: next.end,
        description: next.description || '',
        location: next.extendedProps?.location || '',
        attendees: next.extendedProps?.participants?.map(p => ({ email: p.email, name: p.name })) || []
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

  return (
    <div className="flex h-screen">
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
      />
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
          aria-hidden
        />
      )}

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setSidebarCollapsed(v => !v)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
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
              className="flex items-center gap-2"
              disabled={isGoogleCalendarLoading}
            >
              <CalendarIcon className="w-4 h-4" />
              {isGoogleCalendarLoading ? 'Loading...' : isGoogleCalendarConnected ? 'Add account' : 'Connect'}
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

        {/* Event Drawer */}
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
    </div>
  )
}

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
  backgroundColor: string
  borderColor: string
  source?: 'platform' | 'google' // Track event source
  googleEventId?: string // Google Calendar event ID
  accountId?: string // Google Calendar account ID
  accountEmail?: string // Google Calendar account email
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
    updateEvent: updateGoogleEvent
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
      const googleEvents = googleCalendarEvents.map(googleEvent => {
        console.log('Processing event:', googleEvent)
        const convertedEvent = convertFromGoogleEvent(googleEvent) as {
          platformEventId?: string
          title: string
          start: string
          end: string
          location?: string
          attendees?: Array<{ email: string; name: string }>
          accountId?: string
          accountEmail?: string
        }
        console.log('Converted event:', convertedEvent)
        const account = googleCalendarAccounts.find(acc => acc.id === convertedEvent.accountId)
        console.log('Found account:', account)
        
        const hide = !!account?.hideDetails
        const baseColor = account?.color || '#6b7280'
        const borderColor = account?.color || '#4b5563'
        const rgba10 = (hexColor: string): string => {
          // Convert #rrggbb to rgba with 0.1 alpha
          const m = hexColor.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)
          if (!m) return 'rgba(107,114,128,0.1)'
          const r = Number.parseInt(m[1], 16)
          const g = Number.parseInt(m[2], 16)
          const b = Number.parseInt(m[3], 16)
          return `rgba(${r}, ${g}, ${b}, 0.1)`
        }
        // Skip Google events that are mirrors of platform events to avoid duplicates
        if (convertedEvent.platformEventId) {
          return null as unknown as CalendarEvent
        }
        const calendarEvent = {
          id: `google-${googleEvent.id}`,
          title: hide ? 'Busy' : convertedEvent.title,
          start: convertedEvent.start,
          end: convertedEvent.end,
          backgroundColor: hide ? rgba10(baseColor) : baseColor, // 10% opacity when hidden
          borderColor: hide ? rgba10(borderColor) : borderColor,
          source: 'google' as const,
          googleEventId: googleEvent.id,
          accountId: convertedEvent.accountId,
          accountEmail: convertedEvent.accountEmail,
          extendedProps: {
            trainer: hide ? 'Busy' : (account?.name || 'Google Calendar'),
            participants: [],
            plan: hide ? 'Busy' : convertedEvent.title,
            location: hide ? '' : (convertedEvent.location || ''),
            maxParticipants: 0,
            currentParticipants: 0,
            medicalFlags: [],
            attendance: {}
          }
        } as CalendarEvent
        
        console.log('Created calendar event:', calendarEvent)
        return calendarEvent
      }).filter(Boolean) as CalendarEvent[]

      console.log('All Google events processed:', googleEvents)

      // Filter out existing Google events and add new ones
      setEvents(prev => {
        const platformEvents = prev.filter(event => event.source === 'platform')
        // Filter Google events by visible accounts
        const filteredGoogle = googleEvents.filter(e => !e.accountId || visibleAccounts[e.accountId] !== false)
        const allEvents = [...platformEvents, ...filteredGoogle]
        console.log('Updated events state:', allEvents)
        return allEvents
      })
    } else if (isGoogleCalendarConnected && googleCalendarEvents.length === 0) {
      console.log('Google Calendar connected but no events found')
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

  const calendar = useCalendarApp({
    views: [createViewDay(), createViewWeek(), createViewMonthGrid(), createViewMonthAgenda()], // Pass all views to let Schedule-X handle view switching
    events: events.map(event => ({
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
          setDrawerMode(foundEvent.source === 'platform' ? 'edit' : 'view')
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
            description: '',
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
    console.log('Updating Schedule-X calendar with events:', events)
    if (eventsService && calendar) {
      // Clear existing events and add new ones
      const existingEvents = eventsService.getAll()
      console.log('Clearing existing events:', existingEvents.length)
      existingEvents.forEach(event => {
        eventsService.remove(event.id)
      })
      
      console.log('Adding new events to Schedule-X:', events.length)
      events.forEach(event => {
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
  }, [events, eventsService, calendar])


  // Force per-event colors (override theme vars) after render
  const calendarRootRef = useRef<HTMLDivElement>(null)
  const eventsRef = useRef<CalendarEvent[]>([])
  const accountsRef = useRef(googleCalendarAccounts)
  useEffect(() => { eventsRef.current = events }, [events])
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

      const rect = col.getBoundingClientRect()
      const scrollable = (col.closest('.sx__view-container') || root.querySelector('.sx__view-container') || col.closest('.sx__view')) as HTMLElement | null
      const scrollTop = scrollable?.scrollTop || 0
      const y = e.clientY - rect.top + scrollTop
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

  useEffect(() => {
    if (!events || events.length === 0) return
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
  }, [events])

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
    setEvents(prev => [...prev, platformEvent])

    if (isGoogleCalendarConnected && googleCalendarAccounts.length > 0) {
      try {
        const scheduleXEvent = {
          id: platformEvent.id,
          title: platformEvent.title,
          start: platformEvent.start,
          end: platformEvent.end,
          description: '',
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
          setEvents(prev => prev.map(ev => ev.id === platformEvent.id ? ({
            ...ev,
            syncedGoogleEventIds: { ...(ev.syncedGoogleEventIds || {}), [targetId]: createdId }
          }) : ev))
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
        description: '',
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
        }
      }))
    } catch (e) {
      console.error('Failed to sync updated event to Google', e)
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
          event={selectedEvent}
          trainers={trainers}
          workoutSpaces={workoutSpaces}
          accounts={googleCalendarAccounts.map(a => ({ id: a.id, email: a.email, name: a.name, customName: a.customName || null }))}
          prefillDates={prefillDates || undefined}
          onCreateEvent={handleCreateEvent}
          onUpdateEvent={handleUpdateEvent}
          onUpdateAttendance={updateAttendance}
        />
      </div>
    </div>
  )
}

"use client"

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Calendar as CalendarIcon, RefreshCw } from 'lucide-react'

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
import { GoogleCalendarSync } from '@/components/google-calendar-sync'
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
    fetchEvents,
    debugState,
    clearAllData
  } = useGoogleCalendar({ autoSync: true })

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    // Get current date and create events for this week
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfterTomorrow = new Date(today)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
    
    return [
      {
        id: '1',
        title: 'Strength Training',
        start: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 09:00`, // 9 AM today
        end: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 10:00`, // 10 AM today
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        source: 'platform',
        extendedProps: {
          trainer: 'Sarah Wilson',
          participants: [
            {
              id: '1',
              name: 'John Doe',
              email: 'john@example.com',
              status: 'active',
              medicalConditions: ['Knee injury'],
              lastAttendance: '2024-01-15',
              trainer: 'Sarah Wilson',
              phone: '+1-555-0123'
            },
            {
              id: '2',
              name: 'Jane Smith',
              email: 'jane@example.com',
              status: 'active',
              medicalConditions: [],
              lastAttendance: '2024-01-15',
              trainer: 'Sarah Wilson',
              phone: '+1-555-0124'
            }
          ],
          plan: 'Strength Training',
          location: 'Gym A',
          maxParticipants: 8,
          currentParticipants: 2,
          medicalFlags: ['Knee injury'],
          attendance: {
            '1': 'present',
            '2': 'present'
          } as Record<string, 'present' | 'absent' | 'late' | 'cancelled'>
        }
      },
      {
        id: '2',
        title: 'Cardio Session',
        start: `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')} 14:00`, // 2 PM tomorrow
        end: `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')} 15:00`, // 3 PM tomorrow
        backgroundColor: '#10b981',
        borderColor: '#059669',
        source: 'platform',
        extendedProps: {
          trainer: 'Mike Johnson',
          participants: [
            {
              id: '3',
              name: 'Bob Wilson',
              email: 'bob@example.com',
              status: 'active',
              medicalConditions: ['Back pain', 'Diabetes'],
              lastAttendance: '2024-01-12',
              trainer: 'Mike Johnson',
              phone: '+1-555-0125'
            }
          ],
          plan: 'Cardio Training',
          location: 'Gym B',
          maxParticipants: 6,
          currentParticipants: 1,
          medicalFlags: ['Back pain', 'Diabetes'],
          attendance: {
            '3': 'present'
          } as Record<string, 'present' | 'absent' | 'late' | 'cancelled'>
        }
      }
    ]
  })

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


  
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'view' | 'create' | 'edit'>('view')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showGoogleCalendarSync, setShowGoogleCalendarSync] = useState(false)
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
        const convertedEvent = convertFromGoogleEvent(googleEvent)
        console.log('Converted event:', convertedEvent)
        const account = googleCalendarAccounts.find(acc => acc.id === convertedEvent.accountId)
        console.log('Found account:', account)
        
        const calendarEvent = {
          id: `google-${googleEvent.id}`,
          title: convertedEvent.title,
          start: convertedEvent.start,
          end: convertedEvent.end,
          backgroundColor: account?.color || '#6b7280', // Use account color or fallback to grey
          borderColor: account?.color || '#4b5563',
          source: 'google' as const,
          googleEventId: googleEvent.id,
          accountId: convertedEvent.accountId,
          accountEmail: convertedEvent.accountEmail,
          extendedProps: {
            trainer: account?.name || 'Google Calendar',
            participants: convertedEvent.attendees || [],
            plan: convertedEvent.title,
            location: convertedEvent.location || '',
            maxParticipants: 0,
            currentParticipants: 0,
            medicalFlags: [],
            attendance: {}
          }
        } as CalendarEvent
        
        console.log('Created calendar event:', calendarEvent)
        return calendarEvent
      })

      console.log('All Google events processed:', googleEvents)

      // Filter out existing Google events and add new ones
      setEvents(prev => {
        const platformEvents = prev.filter(event => event.source === 'platform')
        const allEvents = [...platformEvents, ...googleEvents]
        console.log('Updated events state:', allEvents)
        return allEvents
      })
    } else if (isGoogleCalendarConnected && googleCalendarEvents.length === 0) {
      console.log('Google Calendar connected but no events found')
    } else {
      console.log('Google Calendar not connected or no events')
    }
  }, [googleCalendarEvents, isGoogleCalendarConnected, googleCalendarAccounts, convertFromGoogleEvent])


  


  // Schedule-X calendar setup
  const eventsService = useMemo(() => createEventsServicePlugin(), [])
  const dragAndDropPlugin = useMemo(() => createDragAndDropPlugin(), [])
  const resizePlugin = useMemo(() => createResizePlugin(30), []) // 30 minute intervals when resizing
  
  const calendar = useCalendarApp({
    views: [createViewDay(), createViewWeek(), createViewMonthGrid(), createViewMonthAgenda()], // Pass all views to let Schedule-X handle view switching
    events: events.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      calendarId: 'workout-calendar'
    })),
    calendars: {
      'workout-calendar': {
        colorName: 'blue',
        lightColors: {
          main: '#3b82f6',
          container: '#dbeafe',
          onContainer: '#1e40af'
        },
        darkColors: {
          main: '#60a5fa',
          onContainer: '#dbeafe',
          container: '#1e3a8a'
        }
      }
    },
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
      onEventUpdate: (updatedEvent) => {
        // Handle event drag and drop updates
        setEvents(prev => prev.map(event => 
          event.id === updatedEvent.id 
            ? { 
                ...event, 
                start: updatedEvent.start,
                end: updatedEvent.end 
              }
            : event
        ))
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
          calendarId: 'workout-calendar'
        })
      })
      
      console.log('Schedule-X calendar updated. Total events:', eventsService.getAll().length)
    }
  }, [events, eventsService, calendar])





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

  const handleCreateEvent = (eventData: CalendarEvent) => {
    setEvents(prev => [...prev, eventData])
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setSelectedEvent(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Add Event Button */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="text-sm text-muted-foreground">
          Workout Plans
        </div>
        <div className="flex items-center gap-2">
          {googleCalendarError && (
            <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              Google Calendar Error
            </div>
          )}
          <Button 
            onClick={() => setShowGoogleCalendarSync(true)}
            variant="outline"
            className="flex items-center gap-2"
            disabled={isGoogleCalendarLoading}
          >
            <CalendarIcon className="w-4 h-4" />
            {isGoogleCalendarLoading ? 'Loading...' : isGoogleCalendarConnected ? 'Connected' : 'Connect'}
          </Button>
          {isGoogleCalendarConnected && (
            <>
              <Button 
                onClick={() => {
                  console.log('Manual refresh of Google Calendar events')
                  fetchEvents()
                }}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button 
                onClick={() => {
                  console.log('Debug Google Calendar state')
                  debugState()
                }}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                Debug
              </Button>
              <Button 
                onClick={() => {
                  console.log('Clearing all Google Calendar data')
                  clearAllData()
                  window.location.reload()
                }}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                Clear Data
              </Button>
            </>
          )}
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
         onCreateEvent={handleCreateEvent}
         onUpdateAttendance={updateAttendance}
       />

       {/* Google Calendar Sync Modal */}
       {showGoogleCalendarSync && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-background rounded-lg shadow-xl max-w-md w-full">
             <GoogleCalendarSync
               onEventsSync={(syncedEvents) => {
                 console.log('Synced events:', syncedEvents)
                 setShowGoogleCalendarSync(false)
               }}
               onEventCreate={(event) => {
                 console.log('Event created in Google Calendar:', event)
               }}
               onEventUpdate={(eventId, event) => {
                 console.log('Event updated in Google Calendar:', eventId, event)
               }}
               onEventDelete={(eventId) => {
                 console.log('Event deleted from Google Calendar:', eventId)
               }}
             />
             <div className="p-4 border-t">
               <Button 
                 onClick={() => setShowGoogleCalendarSync(false)}
                 variant="outline"
                 className="w-full"
               >
                 Close
               </Button>
             </div>
           </div>
         </div>
       )}
    </div>
  )
}

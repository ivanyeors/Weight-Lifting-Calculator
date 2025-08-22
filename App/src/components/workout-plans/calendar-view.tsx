"use client"

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Plus, Settings, Users, Clock, MapPin, AlertTriangle, Star, Mail } from 'lucide-react'
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

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
import '@schedule-x/theme-shadcn/dist/index.css'



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

  const [users] = useState<User[]>([
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
    },
    {
      id: '3',
      name: 'Bob Wilson',
      email: 'bob@example.com',
      status: 'postponed',
      medicalConditions: ['Back pain', 'Diabetes'],
      lastAttendance: '2024-01-12',
      trainer: 'Mike Johnson',
      phone: '+1-555-0125'
    }
  ])

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

  const [view, setView] = useState<'monthGrid' | 'week' | 'day'>('monthGrid')
  
  // Date range selection state
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: new Date(),
    to: new Date(new Date().setMonth(new Date().getMonth() + 1))
  })

  // Note: Schedule-X handles date navigation automatically
  
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [showTrainerManagement, setShowTrainerManagement] = useState(false)
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [newEventData, setNewEventData] = useState<{
    title: string
    start: string
    end: string
    trainer: string
    location: string
    maxParticipants: number
    description: string
  }>({
    title: '',
    start: '',
    end: '',
    trainer: '',
    location: '',
    maxParticipants: 8,
    description: ''
  })

  // Schedule-X calendar setup
  const eventsService = useMemo(() => createEventsServicePlugin(), [])
  const dragAndDropPlugin = useMemo(() => createDragAndDropPlugin(), [])
  
  const calendar = useCalendarApp({
    views: [createViewDay(), createViewWeek(), createViewMonthGrid(), createViewMonthAgenda()],
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
    plugins: [eventsService, dragAndDropPlugin],
    theme: 'shadcn',
    isDark: true,
    callbacks: {
      onEventClick: (event) => {
        const foundEvent = events.find(e => e.id === event.id)
        if (foundEvent) {
          setSelectedEvent(foundEvent)
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
    if (eventsService && calendar) {
      // Clear existing events and add new ones
      eventsService.getAll().forEach(event => {
        eventsService.remove(event.id)
      })
      
      events.forEach(event => {
        eventsService.add({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          calendarId: 'workout-calendar'
        })
      })
    }
  }, [events, eventsService, calendar])

  const syncWithGoogleCalendar = useCallback(() => {
    // TODO: Implement Google Calendar sync
  }, [])

  const syncWithAppleCalendar = useCallback(() => {
    // TODO: Implement Apple Calendar sync
  }, [])

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

  const createEvent = () => {
    if (!newEventData.title || !newEventData.start || !newEventData.end) return

    const trainer = trainers.find(t => t.id === newEventData.trainer)
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: newEventData.title,
      start: newEventData.start.replace('T', ' '), // Convert 'YYYY-MM-DDTHH:mm' to 'YYYY-MM-DD HH:mm'
      end: newEventData.end.replace('T', ' '), // Convert 'YYYY-MM-DDTHH:mm' to 'YYYY-MM-DD HH:mm'
      backgroundColor: '#3b82f6',
      borderColor: '#2563eb',
      extendedProps: {
        trainer: trainer?.name || 'Unassigned',
        participants: [],
        plan: newEventData.title,
        location: newEventData.location,
        maxParticipants: newEventData.maxParticipants,
        currentParticipants: 0,
        medicalFlags: [],
        attendance: {}
      }
    }

    setEvents(prev => [...prev, newEvent])
    setShowEventDialog(false)
    setNewEventData({
      title: '',
      start: '',
      end: '',
      trainer: '',
      location: '',
      maxParticipants: 8,
      description: ''
    })
  }

  // Memoize view change handler
  const handleViewChange = useCallback((value: string) => {
    setView(value as 'monthGrid' | 'week' | 'day')
    // Note: Schedule-X view changes are handled by the component automatically
  }, [])

  // Memoize add event handler
  const handleAddEvent = useCallback(() => {
    setNewEventData({
      title: '',
      start: '',
      end: '',
      trainer: '',
      location: '',
      maxParticipants: 8,
      description: ''
    })
    setShowEventDialog(true)
  }, [])

  return (
    <div className="space-y-6">
      {/* Management Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <Select value={view} onValueChange={handleViewChange}>
              <SelectTrigger className="w-40 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthGrid">Month View</SelectItem>
                <SelectItem value="week">Week View</SelectItem>
                <SelectItem value="day">Day View</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            variant="outline"
            className="bg-background border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-colors"
            onClick={handleAddEvent}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="bg-background border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-colors"
            onClick={() => setShowUserManagement(true)}
          >
            <Users className="w-4 h-4 mr-2" />
            Manage Users
          </Button>
          <Button 
            variant="outline" 
            className="bg-background border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-colors"
            onClick={() => setShowTrainerManagement(true)}
          >
            <Star className="w-4 h-4 mr-2" />
            Manage Trainers
          </Button>
          <Button 
            variant="outline" 
            className="bg-background border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-colors"
            onClick={syncWithGoogleCalendar}
          >
            <Settings className="w-4 h-4 mr-2" />
            Google Calendar
          </Button>
          <Button 
            variant="outline" 
            className="bg-background border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-colors"
            onClick={syncWithAppleCalendar}
          >
            <Settings className="w-4 h-4 mr-2" />
            Apple Calendar
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Workout Calendar</h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {/* Date Range Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[280px] justify-start text-left font-normal",
                      !dateRange?.from && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      format(dateRange.from, "MMM dd, yyyy")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    {dateRange?.to && (
                      <span className="mx-1">to</span>
                    )}
                    {dateRange?.to ? (
                      format(dateRange.to, "MMM dd, yyyy")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <ShadcnCalendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      if (range) {
                        setDateRange({
                          from: range.from,
                          to: range.to
                        })
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              
              {/* Quick Navigation */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    setDateRange({ from: today, to: today })
                  }}
                  className="bg-background border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-colors text-xs"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const weekStart = new Date(today)
                    weekStart.setDate(today.getDate() - today.getDay())
                    const weekEnd = new Date(weekStart)
                    weekEnd.setDate(weekStart.getDate() + 6)
                    setDateRange({ from: weekStart, to: weekEnd })
                  }}
                  className="bg-background border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-colors text-xs"
                >
                  This Week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
                    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
                    setDateRange({ from: monthStart, to: monthEnd })
                  }}
                  className="bg-background border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-colors text-xs"
                >
                  This Month
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
                    setDateRange({ from: today, to: nextMonth })
                  }}
                  className="bg-background border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-colors text-xs"
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <style jsx global>{`
            .sx-react-calendar-wrapper {
              width: 100%;
              height: 700px;
              max-width: 100%;
              max-height: 90vh;
            }
            
            /* Dark theme overrides for Schedule-X */
            .dark .sx-react-calendar-wrapper .sx-calendar {
              background-color: hsl(var(--card));
              color: hsl(var(--card-foreground));
              border-color: hsl(var(--border));
            }
            
            .dark .sx-react-calendar-wrapper .sx-calendar__header {
              background-color: hsl(var(--muted));
              color: hsl(var(--muted-foreground));
              border-color: hsl(var(--border));
            }
            
            .dark .sx-react-calendar-wrapper .sx-calendar__month-view-day {
              background-color: hsl(var(--card));
              border-color: hsl(var(--border));
              color: hsl(var(--card-foreground));
            }
            
            .dark .sx-react-calendar-wrapper .sx-calendar__month-view-day:hover {
              background-color: hsl(var(--accent));
            }
            
            .dark .sx-react-calendar-wrapper .sx-calendar__week-view-time-grid {
              background-color: hsl(var(--card));
              border-color: hsl(var(--border));
            }
            
            .dark .sx-react-calendar-wrapper .sx-calendar__day-view-time-grid {
              background-color: hsl(var(--card));
              border-color: hsl(var(--border));
            }
            
            .dark .sx-react-calendar-wrapper .sx-calendar__event {
              background-color: hsl(var(--primary));
              color: hsl(var(--primary-foreground));
              border-color: hsl(var(--primary));
            }
            
            .dark .sx-react-calendar-wrapper .sx-calendar__event:hover {
              background-color: hsl(var(--primary)/0.8);
            }
          `}</style>
          <div className="h-[700px] sx-react-calendar-wrapper dark">
            <ScheduleXCalendar calendarApp={calendar} />
          </div>
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
              <DialogDescription>
                Workout session details and participant information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {new Date(selectedEvent.start).toLocaleString()} - {new Date(selectedEvent.end).toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Trainer: {selectedEvent.extendedProps.trainer}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{selectedEvent.extendedProps.location}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {selectedEvent.extendedProps.currentParticipants}/{selectedEvent.extendedProps.maxParticipants} participants
                  </span>
                </div>
              </div>
              
              {/* Participants with Attendance */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Participants & Attendance</Label>
                <div className="space-y-2">
                  {selectedEvent.extendedProps.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback className="text-xs">
                            {participant.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{participant.name}</div>
                          <div className="text-xs text-muted-foreground">{participant.email}</div>
                          {participant.medicalConditions.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                              <span className="text-xs text-red-600">
                                {participant.medicalConditions.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={selectedEvent.extendedProps.attendance[participant.id] || 'present'}
                          onValueChange={(value) => updateAttendance(selectedEvent.id, participant.id, value as 'present' | 'absent' | 'late' | 'cancelled')}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Medical Alerts */}
              {selectedEvent.extendedProps.medicalFlags.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Medical Conditions Present</span>
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    {selectedEvent.extendedProps.medicalFlags.join(', ')}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">Edit Session</Button>
                <Button variant="outline" className="flex-1">Manage Participants</Button>
                <Button variant="outline" className="flex-1">View Details</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* User Management Modal */}
      <Dialog open={showUserManagement} onOpenChange={setShowUserManagement}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Management</DialogTitle>
            <DialogDescription>
              Manage users, medical conditions, and attendance status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    <div className="text-xs text-muted-foreground">Last attendance: {user.lastAttendance}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.medicalConditions.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {user.medicalConditions.length} medical flags
                    </Badge>
                  )}
                  <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                    {user.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Mail className="w-3 h-3 mr-1" />
                    Contact
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Trainer Management Modal */}
      <Dialog open={showTrainerManagement} onOpenChange={setShowTrainerManagement}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Trainer Management</DialogTitle>
            <DialogDescription>
              Manage trainers and their assignments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {trainers.map((trainer) => (
              <div key={trainer.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={trainer.avatar} />
                    <AvatarFallback>
                      {trainer.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{trainer.name}</div>
                    <div className="text-sm text-muted-foreground">{trainer.email}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs">{trainer.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Specialties</div>
                    <div className="text-sm">{trainer.specialties.join(', ')}</div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Mail className="w-3 h-3 mr-1" />
                    Contact
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Creation Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Workout Session</DialogTitle>
            <DialogDescription>
              Schedule a new workout session with trainer and participants.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Session Title</Label>
              <Input 
                placeholder="Enter session title" 
                value={newEventData.title}
                onChange={(e) => setNewEventData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input 
                  type="datetime-local" 
                  value={newEventData.start}
                  onChange={(e) => setNewEventData(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input 
                  type="datetime-local" 
                  value={newEventData.end}
                  onChange={(e) => setNewEventData(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Trainer</Label>
              <Select value={newEventData.trainer} onValueChange={(value) => setNewEventData(prev => ({ ...prev, trainer: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select trainer" />
                </SelectTrigger>
                <SelectContent>
                  {trainers.map((trainer) => (
                    <SelectItem key={trainer.id} value={trainer.id}>
                      {trainer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input 
                placeholder="Enter location" 
                value={newEventData.location}
                onChange={(e) => setNewEventData(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div>
              <Label>Max Participants</Label>
              <Input 
                type="number" 
                placeholder="8" 
                value={newEventData.maxParticipants}
                onChange={(e) => setNewEventData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) || 8 }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea 
                placeholder="Enter session description" 
                value={newEventData.description}
                onChange={(e) => setNewEventData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={createEvent}>Create Session</Button>
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setShowEventDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Clock, MapPin, AlertTriangle, Users, X } from 'lucide-react'

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

interface CalendarEventDrawerProps {
  isOpen: boolean
  onClose: () => void
  mode: 'view' | 'create' | 'edit'
  event?: CalendarEvent | null
  trainers: Trainer[]
  onCreateEvent?: (eventData: CalendarEvent) => void
  onUpdateEvent?: (eventId: string, eventData: Partial<CalendarEvent>) => void
  onUpdateAttendance?: (eventId: string, userId: string, status: 'present' | 'absent' | 'late' | 'cancelled') => void
  prefillDates?: { start: string; end: string }
}

export function CalendarEventDrawer({
  isOpen,
  onClose,
  mode,
  event,
  trainers,
  onCreateEvent,
  onUpdateAttendance,
  prefillDates
}: CalendarEventDrawerProps) {
  const [newEventData, setNewEventData] = useState({
    title: '',
    start: '',
    end: '',
    trainer: '',
    location: '',
    maxParticipants: 8,
    description: ''
  })

  // Reset form when drawer opens for creation
  useEffect(() => {
    if (isOpen && mode === 'create') {
      setNewEventData({
        title: '',
        start: prefillDates?.start || '',
        end: prefillDates?.end || '',
        trainer: '',
        location: '',
        maxParticipants: 8,
        description: ''
      })
    }
  }, [isOpen, mode, prefillDates])

  const handleCreateEvent = () => {
    if (!newEventData.title || !newEventData.start || !newEventData.end) return

    const trainer = trainers.find(t => t.id === newEventData.trainer)
    const eventData = {
      id: Date.now().toString(),
      title: newEventData.title,
      start: newEventData.start.replace('T', ' '),
      end: newEventData.end.replace('T', ' '),
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

    onCreateEvent?.(eventData)
    onClose()
  }

  const renderCreateForm = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Create New Workout Session</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
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
        
        <div className="flex gap-2 pt-4">
          <Button className="flex-1" onClick={handleCreateEvent}>Create Session</Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )

  const renderEventDetails = () => {
    if (!event) return null

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{event.title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleTimeString()}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Trainer: {event.extendedProps.trainer}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{event.extendedProps.location}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                {event.extendedProps.currentParticipants}/{event.extendedProps.maxParticipants} participants
              </span>
            </div>
          </div>
          
          {/* Participants with Attendance */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Participants & Attendance</Label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {event.extendedProps.participants.map((participant) => (
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
                      value={event.extendedProps.attendance[participant.id] || 'present'}
                      onValueChange={(value) => onUpdateAttendance?.(event.id, participant.id, value as 'present' | 'absent' | 'late' | 'cancelled')}
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
          {event.extendedProps.medicalFlags.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Medical Conditions Present</span>
              </div>
              <div className="text-xs text-red-600 mt-1">
                {event.extendedProps.medicalFlags.join(', ')}
              </div>
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1">Edit Session</Button>
            <Button variant="outline" className="flex-1">Manage Participants</Button>
            <Button variant="outline" className="flex-1">View Details</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-1/2 lg:w-1/3 xl:w-1/4 bg-background border-l shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto p-6">
          {mode === 'create' && renderCreateForm()}
          {mode === 'view' && renderEventDetails()}
        </div>
      </div>
    </>
  )
}

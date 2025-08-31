"use client"

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, Clock, MapPin, AlertTriangle, Users, X } from 'lucide-react'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { supabase } from '@/lib/supabaseClient'
import { Checkbox } from '@/components/ui/checkbox'

import { DateRange } from 'react-day-picker'
import { format, setHours, setMinutes } from 'date-fns'

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
  targetAccountIds?: string[]
  source?: 'platform' | 'google'
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
  workoutSpaces: { id: string; name: string }[]
  onCreateEvent?: (eventData: CalendarEvent) => void
  onUpdateEvent?: (eventId: string, eventData: Partial<CalendarEvent>) => void
  onUpdateAttendance?: (eventId: string, userId: string, status: 'present' | 'absent' | 'late' | 'cancelled') => void
  prefillDates?: { start: string; end: string }
  // Provide connected accounts for multi-select
  accounts?: { id: string; email: string; name?: string | null; customName?: string | null }[]
}

export function CalendarEventDrawer(props: CalendarEventDrawerProps) {
  const {
    isOpen,
    onClose,
    mode,
    event,
    workoutSpaces,
    accounts = [],
    onCreateEvent,
    prefillDates
  } = props
  const [newEventData, setNewEventData] = useState({
    title: '',
    dateRange: undefined as DateRange | undefined,
    startTime: '09:00',
    endTime: '10:00',
    workoutSpaceId: '',
    description: '',
    targetAccountIds: [] as string[],
    participantIds: [] as string[]
  })

  // Managed users for Participants section (from Users page)
  type ManagedUser = {
    id: string
    name: string
    medical_conditions: string[] | null
  }
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([])
  const [muscles, setMuscles] = useState<Array<{ id: string; name: string }>>([])
  const [userInjuries, setUserInjuries] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load users
        const { data: usersData } = await supabase
          .from('managed_users')
          .select('id, name, medical_conditions')
          .order('updated_at', { ascending: false })

        const users = (usersData ?? []) as ManagedUser[]
        setManagedUsers(users)

        // Load muscles for label names
        const { data: musclesData } = await supabase
          .from('muscles')
          .select('id, name')
          .order('name', { ascending: true })
        setMuscles((musclesData ?? []) as Array<{ id: string; name: string }>)

        // Load injuries mapping
        const ids = users.map(u => u.id)
        if (ids.length > 0) {
          const { data: inj } = await supabase
            .from('managed_user_injuries')
            .select('user_id, muscle_id')
            .in('user_id', ids)
          const map: Record<string, string[]> = {}
          ;(inj ?? []).forEach((r: { user_id: string; muscle_id: string }) => {
            const uid = r.user_id
            const mid = r.muscle_id
            if (!map[uid]) map[uid] = []
            map[uid].push(mid)
          })
          setUserInjuries(map)
        } else {
          setUserInjuries({})
        }
      } catch {
        // fail silently for drawer
        // console.error('Failed to load managed users for drawer', e)
      }
    }
    if (isOpen) loadData()
  }, [isOpen])

  const muscleIdToName = useMemo(() => {
    const m: Record<string, string> = {}
    muscles.forEach((mm) => { m[mm.id] = mm.name })
    return m
  }, [muscles])

  // Simple shadcn-style combobox multi-select for participants
  function ParticipantsMultiSelect({
    items,
    value,
    onChange,
    placeholder = 'Select participants'
  }: {
    items: Array<{ id: string; name: string }>
    value: string[]
    onChange: (ids: string[]) => void
    placeholder?: string
  }) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase()
      if (!q) return items
      return items.filter(i => i.name.toLowerCase().includes(q))
    }, [items, query])

    const toggle = (id: string, checked: boolean) => {
      const setIds = new Set(value)
      if (checked) setIds.add(id)
      else setIds.delete(id)
      onChange(Array.from(setIds))
    }

    const selectedLabels = value
      .map(id => items.find(i => i.id === id)?.name || id)
      .filter(Boolean)

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
            <span className="truncate">
              {selectedLabels.length > 0 ? selectedLabels.join(', ') : placeholder}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">{selectedLabels.length}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
          <div className="space-y-2">
            <Input placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="max-h-64 overflow-auto space-y-1">
              {filtered.map((opt) => {
                const checked = value.includes(opt.id)
                return (
                  <Checkbox
                    key={opt.id}
                    variant="chip"
                    checked={checked}
                    onCheckedChange={(c) => toggle(opt.id, c === true)}
                    className="text-sm w-full justify-between"
                  >
                    <span className="truncate">{opt.name}</span>
                  </Checkbox>
                )
              })}
              {filtered.length === 0 && (
                <div className="text-xs text-muted-foreground px-1 py-2">No results</div>
              )}
            </div>
            {value.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {value.map(id => {
                  const label = items.find(i => i.id === id)?.name || id
                  return <Badge key={id} variant="secondary" className="text-[10px] px-2 py-0.5">{label}</Badge>
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  // Reset form when drawer opens for creation
  useEffect(() => {
    if (isOpen && mode === 'create') {
      const toHHMM = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`
      }
      const startPrefill = prefillDates ? new Date(prefillDates.start) : null
      const endPrefill = prefillDates ? new Date(prefillDates.end) : null
      setNewEventData({
        title: '',
        dateRange: prefillDates ? {
          from: startPrefill as Date,
          to: endPrefill as Date
        } : undefined,
        startTime: startPrefill ? toHHMM(startPrefill) : '09:00',
        endTime: endPrefill ? toHHMM(endPrefill) : '10:00',
        workoutSpaceId: '',
        description: '',
        targetAccountIds: [],
        participantIds: []
      })
    }
  }, [isOpen, mode, prefillDates])

  const handleCreateEvent = () => {
    if (!newEventData.title || !newEventData.dateRange?.from) return

    const workoutSpace = workoutSpaces.find(s => s.id === newEventData.workoutSpaceId)
    
    // Parse start and end times
    const [startHour, startMinute] = newEventData.startTime.split(':').map(Number)
    const [endHour, endMinute] = newEventData.endTime.split(':').map(Number)
    
    // Create start and end dates with times
    const startDate = setMinutes(setHours(newEventData.dateRange.from, startHour), startMinute)
    const endDate = newEventData.dateRange.to 
      ? setMinutes(setHours(newEventData.dateRange.to, endHour), endMinute)
      : setMinutes(setHours(newEventData.dateRange.from, endHour), endMinute)
    
    const selectedAccounts = accounts.filter(a => newEventData.targetAccountIds.includes(a.id))
    const trainerLabel = selectedAccounts[0] ? (selectedAccounts[0].customName || selectedAccounts[0].name || selectedAccounts[0].email) : 'Unassigned'

    // Build participants from selected managed users
    const selectedParticipants = newEventData.participantIds
      .map(id => managedUsers.find(u => u.id === id))
      .filter(Boolean)
      .map(u => ({
        id: (u as ManagedUser).id,
        name: (u as ManagedUser).name,
        email: '',
        status: 'active' as const,
        medicalConditions: ((u as ManagedUser).medical_conditions ?? []),
        lastAttendance: '',
        trainer: trainerLabel,
        phone: '',
        avatar: undefined
      }))

    const eventData = {
      id: Date.now().toString(),
      title: newEventData.title,
      start: format(startDate, "yyyy-MM-dd HH:mm"),
      end: format(endDate, "yyyy-MM-dd HH:mm"),
      backgroundColor: '#3b82f6',
      borderColor: '#2563eb',
      targetAccountIds: [...newEventData.targetAccountIds],
      extendedProps: {
        trainer: trainerLabel,
        participants: selectedParticipants as unknown as User[],
        plan: newEventData.title,
        location: workoutSpace?.name || 'No location specified',
        maxParticipants: selectedParticipants.length,
        currentParticipants: selectedParticipants.length,
        medicalFlags: [],
        attendance: {}
      },
      // Store selected accounts for sync
      syncedGoogleEventIds: {},
      source: 'platform' as const
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
        
        <div className="space-y-4">
          <div>
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {newEventData.dateRange?.from ? (
                    format(newEventData.dateRange.from, "LLL dd, y")
                  ) : (
                    <span>Select date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={newEventData.dateRange?.from}
                  onSelect={(date) => setNewEventData(prev => ({ 
                    ...prev, 
                    dateRange: date ? { from: date, to: date } : undefined 
                  }))}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="time-from">Start Time</Label>
              <div className="relative flex w-full items-center gap-2">
                <Clock className="text-muted-foreground pointer-events-none absolute left-2.5 size-4 select-none" />
                <Input
                  id="time-from"
                  type="time"
                  step="1"
                  value={newEventData.startTime}
                  onChange={(e) => setNewEventData(prev => ({ ...prev, startTime: e.target.value }))}
                  className="appearance-none pl-8 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="time-to">End Time</Label>
              <div className="relative flex w-full items-center gap-2">
                <Clock className="text-muted-foreground pointer-events-none absolute left-2.5 size-4 select-none" />
                <Input
                  id="time-to"
                  type="time"
                  step="1"
                  value={newEventData.endTime}
                  onChange={(e) => setNewEventData(prev => ({ ...prev, endTime: e.target.value }))}
                  className="appearance-none pl-8 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
              </div>
            </div>
          </div>
          
          {!newEventData.dateRange?.from && (
            <p className="text-sm text-muted-foreground mt-1">
              Select a date for your workout session
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label>Accounts to sync</Label>
          <div className="flex flex-wrap gap-2">
            {accounts.map(acc => {
              const label = acc.customName || acc.name || acc.email
              const selected = newEventData.targetAccountIds.includes(acc.id)
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setNewEventData(prev => ({
                    ...prev,
                    targetAccountIds: selected
                      ? prev.targetAccountIds.filter(id => id !== acc.id)
                      : [...prev.targetAccountIds, acc.id]
                  }))}
                  className={`px-2 py-1 text-xs rounded border ${selected ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {newEventData.targetAccountIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {newEventData.targetAccountIds.map(id => {
                const acc = accounts.find(a => a.id === id)
                const label = acc ? (acc.customName || acc.name || acc.email) : id
                return <Badge key={id} variant="secondary">{label}</Badge>
              })}
            </div>
          )}
        </div>

        {/* Participants multi-select from Users (combobox) */}
        <div className="space-y-2">
          <Label>Participants</Label>
          <ParticipantsMultiSelect
            items={managedUsers.map(u => ({ id: u.id, name: u.name }))}
            value={newEventData.participantIds}
            onChange={(ids) => setNewEventData(prev => ({ ...prev, participantIds: ids }))}
          />
        </div>
        
        <div>
          <Label>Workout Space</Label>
          <Select value={newEventData.workoutSpaceId} onValueChange={(value) => setNewEventData(prev => ({ ...prev, workoutSpaceId: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select workout space" />
            </SelectTrigger>
            <SelectContent>
              {workoutSpaces.map((space) => (
                <SelectItem key={space.id} value={space.id}>
                  {space.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Max participants derived from selection; no numeric field */}
        
        <div>
          <Label>Description</Label>
          <Textarea 
            placeholder="Enter session description" 
            value={newEventData.description}
            onChange={(e) => setNewEventData(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button 
            className="flex-1" 
            onClick={handleCreateEvent}
            disabled={!newEventData.title || !newEventData.dateRange?.from}
          >
            Create Session
          </Button>
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
          
          {/* Participants (from selected event participants) */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Participants & Attendance</Label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(event.extendedProps.participants || []).map((p) => {
                const injuryNames = (userInjuries[p.id] || []).map((mid) => muscleIdToName[mid]).filter(Boolean)
                const medical = (p.medicalConditions ?? [])
                return (
                  <div key={p.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-sm">{p.name}</div>
                        {medical.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                            <span className="text-xs text-red-600">
                              {medical.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {injuryNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {injuryNames.map((name) => (
                          <Badge key={name} variant="secondary" className="text-[10px] px-2 py-0.5">{name}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Medical Alerts card removed; conditions shown on user cards */}
          
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setIsEditing(true)}>Edit Session</Button>
          </div>
        </div>
      </div>
    )
  }

  // Edit Session state/UI
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    title: '',
    date: undefined as Date | undefined,
    startTime: '09:00',
    endTime: '10:00',
    workoutSpaceId: '',
    description: '',
    participantIds: [] as string[]
  })

  useEffect(() => {
    if (isOpen && event) {
      // Prefill edit fields from event when opening drawer or switching event
      try {
        const start = new Date(event.start)
        const end = new Date(event.end)
        const pad = (n: number) => String(n).padStart(2, '0')
        const toHHMM = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
        const guessedSpace = workoutSpaces.find(ws => ws.name === event.extendedProps.location)?.id || ''
        setEditData({
          title: event.title,
          date: start,
          startTime: toHHMM(start),
          endTime: toHHMM(end),
          workoutSpaceId: guessedSpace,
          description: '',
          participantIds: (event.extendedProps.participants || []).map(p => p.id)
        })
      } catch {
        // noop
      }
      // If the drawer is explicitly opened in 'edit' mode, auto-enter edit
      setIsEditing(mode === 'edit')
    }
  }, [isOpen, event, workoutSpaces, mode])

  const handleSaveEdit = () => {
    if (!event) return
    if (!editData.date) return
    const [sh, sm] = editData.startTime.split(':').map(Number)
    const [eh, em] = editData.endTime.split(':').map(Number)
    const start = new Date(editData.date)
    start.setHours(sh); start.setMinutes(sm); start.setSeconds(0); start.setMilliseconds(0)
    const end = new Date(editData.date)
    end.setHours(eh); end.setMinutes(em); end.setSeconds(0); end.setMilliseconds(0)
    const space = workoutSpaces.find(ws => ws.id === editData.workoutSpaceId)

    // Build participants from selected managed users for edit
    const selectedParticipants = editData.participantIds
      .map(id => managedUsers.find(u => u.id === id))
      .filter(Boolean)
      .map(u => ({
        id: (u as ManagedUser).id,
        name: (u as ManagedUser).name,
        email: '',
        status: 'active' as const,
        medicalConditions: ((u as ManagedUser).medical_conditions ?? []),
        lastAttendance: '',
        trainer: event.extendedProps.trainer,
        phone: '',
        avatar: undefined
      }))

    const partial: Partial<CalendarEvent> = {
      title: editData.title,
      start: format(start, 'yyyy-MM-dd HH:mm'),
      end: format(end, 'yyyy-MM-dd HH:mm'),
      extendedProps: {
        ...event.extendedProps,
        plan: editData.title,
        location: space?.name || event.extendedProps.location,
        maxParticipants: selectedParticipants.length,
        currentParticipants: selectedParticipants.length,
        participants: selectedParticipants as unknown as User[]
      }
    }
    props.onUpdateEvent?.(event.id, partial)
    setIsEditing(false)
    onClose()
  }

  const renderEditForm = () => {
    if (!event) return null
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Workout Session</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Session Title</Label>
            <Input
              placeholder="Enter session title"
              value={editData.title}
              onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {editData.date ? format(editData.date, 'LLL dd, y') : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={editData.date}
                    onSelect={(date) => setEditData(prev => ({ ...prev, date: date || undefined }))}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-time-from">Start Time</Label>
                <div className="relative flex w-full items-center gap-2">
                  <Clock className="text-muted-foreground pointer-events-none absolute left-2.5 size-4 select-none" />
                  <Input id="edit-time-from" type="time" step="1" value={editData.startTime} onChange={(e) => setEditData(prev => ({ ...prev, startTime: e.target.value }))} className="appearance-none pl-8 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none" />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-time-to">End Time</Label>
                <div className="relative flex w-full items-center gap-2">
                  <Clock className="text-muted-foreground pointer-events-none absolute left-2.5 size-4 select-none" />
                  <Input id="edit-time-to" type="time" step="1" value={editData.endTime} onChange={(e) => setEditData(prev => ({ ...prev, endTime: e.target.value }))} className="appearance-none pl-8 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none" />
                </div>
              </div>
            </div>
          </div>
          <div>
            <Label>Workout Space</Label>
            <Select value={editData.workoutSpaceId} onValueChange={(value) => setEditData(prev => ({ ...prev, workoutSpaceId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select workout space" />
              </SelectTrigger>
              <SelectContent>
                {workoutSpaces.map((space) => (
                  <SelectItem key={space.id} value={space.id}>{space.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Participants multi-select from Users (edit via combobox) */}
          <div className="space-y-2">
            <Label>Participants</Label>
            <ParticipantsMultiSelect
              items={managedUsers.map(u => ({ id: u.id, name: u.name }))}
              value={editData.participantIds}
              onChange={(ids) => setEditData(prev => ({ ...prev, participantIds: ids }))}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button className="flex-1" onClick={handleSaveEdit} disabled={!editData.title || !editData.date}>Save Changes</Button>
            <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>Cancel</Button>
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
          {mode === 'edit' && renderEditForm()}
          {mode === 'view' && (isEditing ? renderEditForm() : renderEventDetails())}
        </div>
      </div>
    </>
  )
}

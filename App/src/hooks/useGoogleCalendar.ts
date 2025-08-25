import { useState, useCallback, useEffect } from 'react'
import GoogleCalendarService, { GoogleCalendarEvent } from '@/lib/googleCalendarService'

interface UseGoogleCalendarOptions {
  autoSync?: boolean
  syncInterval?: number // in milliseconds
}

interface GoogleCalendarState {
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  events: any[]
  tokens: any | null
}

export function useGoogleCalendar(options: UseGoogleCalendarOptions = {}) {
  const { autoSync = false, syncInterval = 5 * 60 * 1000 } = options // 5 minutes default

  const [state, setState] = useState<GoogleCalendarState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    events: [],
    tokens: null
  })

  const [googleCalendarService] = useState(() => new GoogleCalendarService({
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirectUri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!,
    scopes: ['https://www.googleapis.com/auth/calendar']
  }))

  // Initialize authentication from stored tokens
  useEffect(() => {
    const storedTokens = localStorage.getItem('googleCalendarTokens')
    if (storedTokens) {
      try {
        const tokens = JSON.parse(storedTokens)
        googleCalendarService.setTokens(tokens)
        setState(prev => ({ ...prev, isAuthenticated: true, tokens }))
      } catch (error) {
        console.error('Error parsing stored tokens:', error)
        localStorage.removeItem('googleCalendarTokens')
      }
    }
  }, [googleCalendarService])

  // Auto-sync functionality
  useEffect(() => {
    if (!autoSync || !state.isAuthenticated) return

    const syncEvents = async () => {
      try {
        const events = await googleCalendarService.getEvents()
        setState(prev => ({ ...prev, events }))
      } catch (error) {
        console.error('Auto-sync error:', error)
        setState(prev => ({ ...prev, error: 'Auto-sync failed' }))
      }
    }

    // Initial sync
    syncEvents()

    // Set up interval for periodic sync
    const interval = setInterval(syncEvents, syncInterval)

    return () => clearInterval(interval)
  }, [autoSync, state.isAuthenticated, syncInterval, googleCalendarService])

  // Get authorization URL
  const getAuthUrl = useCallback(() => {
    return googleCalendarService.getAuthUrl()
  }, [googleCalendarService])

  // Handle authentication callback
  const handleAuthCallback = useCallback(async (code: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const tokens = await googleCalendarService.handleAuthCallback(code)
      
      // Store tokens in localStorage
      localStorage.setItem('googleCalendarTokens', JSON.stringify(tokens))
      
      setState(prev => ({ 
        ...prev, 
        isAuthenticated: true, 
        tokens, 
        isLoading: false 
      }))

      return tokens
    } catch (error) {
      console.error('Authentication error:', error)
      setState(prev => ({ 
        ...prev, 
        error: 'Authentication failed', 
        isLoading: false 
      }))
      throw error
    }
  }, [googleCalendarService])

  // Fetch events from Google Calendar
  const fetchEvents = useCallback(async (timeMin?: string, timeMax?: string) => {
    if (!state.isAuthenticated) {
      throw new Error('Not authenticated with Google Calendar')
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const events = await googleCalendarService.getEvents('primary', timeMin, timeMax)
      setState(prev => ({ ...prev, events, isLoading: false }))
      return events
    } catch (error) {
      console.error('Error fetching events:', error)
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to fetch events', 
        isLoading: false 
      }))
      throw error
    }
  }, [state.isAuthenticated, googleCalendarService])

  // Create event in Google Calendar
  const createEvent = useCallback(async (event: GoogleCalendarEvent) => {
    if (!state.isAuthenticated) {
      throw new Error('Not authenticated with Google Calendar')
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const createdEvent = await googleCalendarService.createEvent(event)
      
      // Add to local events
      setState(prev => ({ 
        ...prev, 
        events: [...prev.events, createdEvent],
        isLoading: false 
      }))

      return createdEvent
    } catch (error) {
      console.error('Error creating event:', error)
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to create event', 
        isLoading: false 
      }))
      throw error
    }
  }, [state.isAuthenticated, googleCalendarService])

  // Update event in Google Calendar
  const updateEvent = useCallback(async (eventId: string, event: Partial<GoogleCalendarEvent>) => {
    if (!state.isAuthenticated) {
      throw new Error('Not authenticated with Google Calendar')
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const updatedEvent = await googleCalendarService.updateEvent(eventId, event)
      
      // Update local events
      setState(prev => ({ 
        ...prev, 
        events: prev.events.map(e => e.id === eventId ? updatedEvent : e),
        isLoading: false 
      }))

      return updatedEvent
    } catch (error) {
      console.error('Error updating event:', error)
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to update event', 
        isLoading: false 
      }))
      throw error
    }
  }, [state.isAuthenticated, googleCalendarService])

  // Delete event from Google Calendar
  const deleteEvent = useCallback(async (eventId: string) => {
    if (!state.isAuthenticated) {
      throw new Error('Not authenticated with Google Calendar')
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      await googleCalendarService.deleteEvent(eventId)
      
      // Remove from local events
      setState(prev => ({ 
        ...prev, 
        events: prev.events.filter(e => e.id !== eventId),
        isLoading: false 
      }))

      return true
    } catch (error) {
      console.error('Error deleting event:', error)
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to delete event', 
        isLoading: false 
      }))
      throw error
    }
  }, [state.isAuthenticated, googleCalendarService])

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem('googleCalendarTokens')
    setState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      events: [],
      tokens: null
    })
  }, [])

  // Convert schedule-x event to Google Calendar format
  const convertToGoogleEvent = useCallback((scheduleXEvent: any): GoogleCalendarEvent => {
    return googleCalendarService.convertToGoogleEvent(scheduleXEvent)
  }, [googleCalendarService])

  // Convert Google Calendar event to schedule-x format
  const convertFromGoogleEvent = useCallback((googleEvent: any) => {
    return googleCalendarService.convertFromGoogleEvent(googleEvent)
  }, [googleCalendarService])

  return {
    // State
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    events: state.events,
    tokens: state.tokens,

    // Actions
    getAuthUrl,
    handleAuthCallback,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    logout,

    // Utilities
    convertToGoogleEvent,
    convertFromGoogleEvent
  }
}

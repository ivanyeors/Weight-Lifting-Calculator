import { useState, useCallback, useEffect } from 'react'
import GoogleCalendarService, { GoogleCalendarEvent, GoogleCalendarAccount } from '@/lib/googleCalendarService'

interface UseGoogleCalendarOptions {
  autoSync?: boolean
  syncInterval?: number // in milliseconds
}

interface GoogleCalendarState {
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  events: any[]
  accounts: GoogleCalendarAccount[]
}

export function useGoogleCalendar(options: UseGoogleCalendarOptions = {}) {
  const { autoSync = false, syncInterval = 5 * 60 * 1000 } = options // 5 minutes default

  const [state, setState] = useState<GoogleCalendarState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    events: [],
    accounts: []
  })

  const [googleCalendarService] = useState(() => new GoogleCalendarService({
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirectUri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!,
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly'
    ]
  }))

    // Initialize authentication from stored accounts
  useEffect(() => {
    googleCalendarService.loadAccountsFromStorage()
    const accounts = googleCalendarService.getAccounts()
    const isAuthenticated = accounts.length > 0
    
    setState(prev => ({
      ...prev,
      isAuthenticated,
      accounts
    }))
  }, [googleCalendarService])

  // Fetch events when authentication state changes
  useEffect(() => {
    if (state.isAuthenticated && autoSync) {
      // Use setTimeout to avoid the dependency issue
      setTimeout(() => {
        googleCalendarService.getAllEvents()
          .then(events => {
            setState(prev => ({ ...prev, events }))
          })
          .catch(error => {
            console.error('Error fetching events:', error)
            setState(prev => ({ ...prev, error: 'Failed to fetch events' }))
          })
      }, 100)
    }
  }, [state.isAuthenticated, autoSync, googleCalendarService])

  // Auto-sync functionality
  useEffect(() => {
    if (!autoSync || !state.isAuthenticated) return

    const syncEvents = async () => {
      try {
        const events = await googleCalendarService.getAllEvents()
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
  const getAuthUrl = useCallback((state?: string) => {
    return googleCalendarService.getAuthUrl(state)
  }, [googleCalendarService])

  // Handle authentication callback
  const handleAuthCallback = useCallback(async (code: string, state?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const account = await googleCalendarService.handleAuthCallback(code, state)
      
      // Update accounts list
      const accounts = googleCalendarService.getAccounts()
      setState(prev => ({ 
        ...prev, 
        isAuthenticated: accounts.length > 0, 
        accounts,
        isLoading: false 
      }))

      return account
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
      console.log('Not authenticated, skipping event fetch')
      return []
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      console.log('Fetching events from Google Calendar...')
      const events = await googleCalendarService.getAllEvents(timeMin, timeMax)
      console.log('Fetched events from Google Calendar:', events)
      console.log('Number of events fetched:', events.length)
      
      if (events.length > 0) {
        console.log('Sample event structure:', events[0])
      }
      
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

  // Create event in Google Calendar for a specific account
  const createEvent = useCallback(async (accountId: string, event: GoogleCalendarEvent) => {
    if (!state.isAuthenticated) {
      throw new Error('Not authenticated with Google Calendar')
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const createdEvent = await googleCalendarService.createEvent(accountId, event)
      
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

  // Update event in Google Calendar for a specific account
  const updateEvent = useCallback(async (accountId: string, eventId: string, event: Partial<GoogleCalendarEvent>) => {
    if (!state.isAuthenticated) {
      throw new Error('Not authenticated with Google Calendar')
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const updatedEvent = await googleCalendarService.updateEvent(accountId, eventId, event)
      
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

  // Delete event from Google Calendar for a specific account
  const deleteEvent = useCallback(async (accountId: string, eventId: string) => {
    if (!state.isAuthenticated) {
      throw new Error('Not authenticated with Google Calendar')
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      await googleCalendarService.deleteEvent(accountId, eventId)
      
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

  // Remove account
  const removeAccount = useCallback((accountId: string) => {
    googleCalendarService.removeAccount(accountId)
    const accounts = googleCalendarService.getAccounts()
    setState(prev => ({ 
      ...prev, 
      isAuthenticated: accounts.length > 0,
      accounts 
    }))
  }, [googleCalendarService])

  // Logout all accounts
  const logout = useCallback(() => {
    localStorage.removeItem('googleCalendarAccounts')
    setState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      events: [],
      accounts: []
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
    accounts: state.accounts,

    // Actions
    getAuthUrl,
    handleAuthCallback,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    removeAccount,
    logout,

    // Utilities
    convertToGoogleEvent,
    convertFromGoogleEvent,
    debugState: () => googleCalendarService.debugState(),
    clearAllData: () => googleCalendarService.clearAllData()
  }
}

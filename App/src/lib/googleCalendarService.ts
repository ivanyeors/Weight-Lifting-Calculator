export interface GoogleCalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  location?: string
  attendees?: Array<{
    email: string
    displayName?: string
  }>
  reminders?: {
    useDefault: boolean
  }
}

export interface GoogleCalendarConfig {
  clientId: string
  redirectUri: string
  scopes: string[]
}

export interface GoogleCalendarAccount {
  id: string
  email: string
  name: string
  accessToken: string
  refreshToken?: string
  color: string
  connectedAt: string
}

class GoogleCalendarService {
  private config: GoogleCalendarConfig
  private accounts: Map<string, GoogleCalendarAccount> = new Map()

  constructor(config: GoogleCalendarConfig) {
    this.config = {
      ...config,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly'
      ]
    }
  }

  // Generate authorization URL for user to grant permissions
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    })

    if (state) {
      params.append('state', state)
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  // Handle the authorization callback
  async handleAuthCallback(code: string, state?: string) {
    try {
      console.log('Starting auth callback with code:', code ? 'present' : 'missing')
      
      const response = await fetch('/api/google-calendar/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code })
      })

      console.log('Token exchange response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Token exchange failed:', response.status, response.statusText, errorText)
        throw new Error(`Failed to exchange code for tokens: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Token exchange successful, received data:', {
        hasAccessToken: !!data.tokens?.access_token,
        hasRefreshToken: !!data.tokens?.refresh_token,
        tokenLength: data.tokens?.access_token?.length
      })
      
      if (!data.tokens?.access_token) {
        throw new Error('No access token received from server')
      }
      
      // Test the token immediately
      console.log('Testing received token...')
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${data.tokens.access_token}`
        }
      })
      
      console.log('User info response status:', userInfoResponse.status, userInfoResponse.statusText)
      
      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text()
        console.error('Token validation failed:', userInfoResponse.status, userInfoResponse.statusText, errorText)
        throw new Error(`Token validation failed: ${userInfoResponse.status} ${userInfoResponse.statusText}`)
      }
      
      const userInfo = await userInfoResponse.json()
      console.log('User info received:', { id: userInfo.id, email: userInfo.email, name: userInfo.name })
      
      // Generate a unique color for this account
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']
      const color = colors[this.accounts.size % colors.length]
      
      const account: GoogleCalendarAccount = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        accessToken: data.tokens.access_token,
        refreshToken: data.tokens.refresh_token,
        color,
        connectedAt: new Date().toISOString()
      }
      
      console.log('Creating account:', { id: account.id, email: account.email, name: account.name })
      this.accounts.set(account.id, account)
      
      // Store accounts in localStorage
      this.saveAccountsToStorage()
      console.log('Account saved to storage')
      
      return account
    } catch (error) {
      console.error('Error handling auth callback:', error)
      throw error
    }
  }



  // Set tokens (for when user is already authenticated)
  setTokens(tokens: any) {
    // This method is kept for backward compatibility
    // It will use the first account or create a default one
    if (this.accounts.size === 0) {
      const account: GoogleCalendarAccount = {
        id: 'default',
        email: 'unknown@example.com',
        name: 'Default Account',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        color: '#3b82f6',
        connectedAt: new Date().toISOString()
      }
      this.accounts.set(account.id, account)
      this.saveAccountsToStorage()
    }
  }

  // Load accounts from localStorage
  loadAccountsFromStorage() {
    try {
      const stored = localStorage.getItem('googleCalendarAccounts')
      console.log('Loading accounts from storage:', stored)
      if (stored) {
        const accounts = JSON.parse(stored)
        console.log('Parsed accounts:', accounts)
        this.accounts.clear()
        accounts.forEach((account: GoogleCalendarAccount) => {
          console.log('Loading account:', account.id, account.email, account.name)
          this.accounts.set(account.id, account)
        })
        console.log('Loaded accounts:', this.accounts.size)
      }
    } catch (error) {
      console.error('Error loading accounts from storage:', error)
    }
  }

  // Save accounts to localStorage
  saveAccountsToStorage() {
    try {
      const accountsArray = Array.from(this.accounts.values())
      localStorage.setItem('googleCalendarAccounts', JSON.stringify(accountsArray))
    } catch (error) {
      console.error('Error saving accounts to storage:', error)
    }
  }

  // Get all connected accounts
  getAccounts(): GoogleCalendarAccount[] {
    return Array.from(this.accounts.values())
  }

  // Get account by ID
  getAccount(accountId: string): GoogleCalendarAccount | undefined {
    return this.accounts.get(accountId)
  }

  // Remove account
  removeAccount(accountId: string) {
    this.accounts.delete(accountId)
    this.saveAccountsToStorage()
  }

  // Get access token for specific account
  getAccessToken(accountId: string): string | null {
    console.log(`Getting access token for account ID: ${accountId}`)
    console.log('Available account IDs:', Array.from(this.accounts.keys()))
    const account = this.accounts.get(accountId)
    console.log('Found account:', account ? { id: account.id, email: account.email, hasToken: !!account.accessToken } : null)
    return account?.accessToken || null
  }

  // Test API connection for a specific account
  async testConnection(accountId: string) {
    console.log(`Testing API connection for account ${accountId}`)
    const accessToken = this.getAccessToken(accountId)
    if (!accessToken) {
      console.error('No access token found for account:', accountId)
      throw new Error('Calendar not initialized. Please authenticate first.')
    }

    console.log('Access token found, testing API call...')

    try {
      // Test with a simple API call to get user info
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      })

      console.log('Test connection response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Test connection failed:', response.status, response.statusText, errorText)
        
        // If token is invalid, remove the account
        if (response.status === 401) {
          console.log('Token is invalid, removing account')
          this.accounts.delete(accountId)
          this.saveAccountsToStorage()
        }
        
        throw new Error(`Test connection failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Test connection successful:', data)
      return data
    } catch (error) {
      console.error('Error testing connection:', error)
      throw error
    }
  }

  // Debug method to check current state
  debugState() {
    console.log('=== Google Calendar Service Debug State ===')
    console.log('Number of accounts:', this.accounts.size)
    console.log('Account IDs:', Array.from(this.accounts.keys()))
    this.accounts.forEach((account, id) => {
      console.log(`Account ${id}:`, {
        email: account.email,
        name: account.name,
        hasAccessToken: !!account.accessToken,
        hasRefreshToken: !!account.refreshToken,
        connectedAt: account.connectedAt
      })
    })
    
    // Check localStorage directly
    const stored = localStorage.getItem('googleCalendarAccounts')
    console.log('Raw localStorage data:', stored)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        console.log('Parsed localStorage data:', parsed)
      } catch (e) {
        console.log('Failed to parse localStorage data:', e)
      }
    }
    console.log('==========================================')
  }

  // Clear all stored data (for debugging/reset)
  clearAllData() {
    console.log('Clearing all Google Calendar data')
    this.accounts.clear()
    localStorage.removeItem('googleCalendarAccounts')
    console.log('All data cleared')
  }

  // Fetch events from Google Calendar for a specific account
  async getEvents(accountId: string, calendarId: string = 'primary', timeMin?: string, timeMax?: string) {
    console.log(`Getting events for account ${accountId}, calendar ${calendarId}`)
    const accessToken = this.getAccessToken(accountId)
    if (!accessToken) {
      console.error('No access token found for account:', accountId)
      throw new Error('Calendar not initialized. Please authenticate first.')
    }

    try {
      // Use a wider time range to ensure we get some events for testing
      const now = new Date()
      const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
      
      const params = new URLSearchParams({
        timeMin: timeMin || startDate.toISOString(),
        timeMax: timeMax || endDate.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '100', // Limit to 100 events for testing
        showDeleted: 'false'
      })

      const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`
      console.log('Fetching events from URL:', url)
      console.log('Time range:', {
        timeMin: timeMin || startDate.toISOString(),
        timeMax: timeMax || endDate.toISOString()
      })
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      })

      console.log('Response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to fetch events:', response.status, response.statusText, errorText)
        throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Full response data:', data)
      console.log(`Received ${data.items?.length || 0} events from Google Calendar`)
      
      if (data.items && data.items.length > 0) {
        console.log('Sample event:', data.items[0])
      }
      
      return data.items || []
    } catch (error) {
      console.error('Error fetching events:', error)
      throw error
    }
  }

  // List available calendars for a specific account
  async listCalendars(accountId: string) {
    console.log(`Listing calendars for account ${accountId}`)
    const accessToken = this.getAccessToken(accountId)
    if (!accessToken) {
      console.error('No access token found for account:', accountId)
      throw new Error('Calendar not initialized. Please authenticate first.')
    }

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      })

      console.log('Calendar list response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to list calendars:', response.status, response.statusText, errorText)
        throw new Error(`Failed to list calendars: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Available calendars:', data.items)
      return data.items || []
    } catch (error) {
      console.error('Error listing calendars:', error)
      throw error
    }
  }

  // Fetch events from all connected accounts
  async getAllEvents(timeMin?: string, timeMax?: string) {
    console.log('Getting all events from accounts:', this.accounts.size)
    const allEvents = []
    
    for (const account of this.accounts.values()) {
      try {
        console.log(`Fetching events for account: ${account.email} (ID: ${account.id})`)
        console.log('Account details:', { id: account.id, email: account.email, hasToken: !!account.accessToken })
        
        // First, test the API connection
        await this.testConnection(account.id)
        console.log(`API connection successful for account ${account.email}`)
        
        // Then, list available calendars
        const calendars = await this.listCalendars(account.id)
        console.log(`Found ${calendars.length} calendars for account ${account.email}`)
        
        // Try to fetch events from the primary calendar
        const events = await this.getEvents(account.id, 'primary', timeMin, timeMax)
        console.log(`Found ${events.length} events for account ${account.email}`)
        allEvents.push(...events.map((event: any) => ({
          ...event,
          _accountId: account.id,
          _accountEmail: account.email,
          _accountColor: account.color
        })))
      } catch (error) {
        console.error(`Error fetching events for account ${account.email}:`, error)
      }
    }
    
    console.log(`Total events found: ${allEvents.length}`)
    return allEvents
  }

  // Create event in Google Calendar for a specific account
  async createEvent(accountId: string, event: GoogleCalendarEvent, calendarId: string = 'primary') {
    const accessToken = this.getAccessToken(accountId)
    if (!accessToken) {
      throw new Error('Calendar not initialized. Please authenticate first.')
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event)
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating event:', error)
      throw error
    }
  }

  // Update event in Google Calendar for a specific account
  async updateEvent(accountId: string, eventId: string, event: Partial<GoogleCalendarEvent>, calendarId: string = 'primary') {
    const accessToken = this.getAccessToken(accountId)
    if (!accessToken) {
      throw new Error('Calendar not initialized. Please authenticate first.')
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event)
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to update event: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating event:', error)
      throw error
    }
  }

  // Delete event from Google Calendar for a specific account
  async deleteEvent(accountId: string, eventId: string, calendarId: string = 'primary') {
    const accessToken = this.getAccessToken(accountId)
    if (!accessToken) {
      throw new Error('Calendar not initialized. Please authenticate first.')
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to delete event: ${response.statusText}`)
      }

      return true
    } catch (error) {
      console.error('Error deleting event:', error)
      throw error
    }
  }

  // Convert schedule-x event to Google Calendar format
  convertToGoogleEvent(scheduleXEvent: any): GoogleCalendarEvent {
    return {
      summary: scheduleXEvent.title,
      description: scheduleXEvent.description || '',
      start: {
        dateTime: scheduleXEvent.start,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: scheduleXEvent.end,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      location: scheduleXEvent.location || '',
      attendees: scheduleXEvent.attendees?.map((attendee: any) => ({
        email: attendee.email,
        displayName: attendee.name
      })) || [],
      reminders: {
        useDefault: true
      }
    }
  }

  // Convert Google Calendar event to schedule-x format
  convertFromGoogleEvent(googleEvent: any) {
    return {
      id: googleEvent.id,
      title: googleEvent.summary,
      start: googleEvent.start.dateTime || googleEvent.start.date,
      end: googleEvent.end.dateTime || googleEvent.end.date,
      description: googleEvent.description,
      location: googleEvent.location,
      attendees: googleEvent.attendees?.map((attendee: any) => ({
        email: attendee.email,
        name: attendee.displayName || attendee.email
      })) || [],
      googleEventId: googleEvent.id,
      accountId: googleEvent._accountId,
      accountEmail: googleEvent._accountEmail,
      accountColor: googleEvent._accountColor
    }
  }
}

export default GoogleCalendarService

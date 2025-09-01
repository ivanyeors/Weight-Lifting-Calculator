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
  // When set to 'transparent', the event is shown as free time
  transparency?: 'opaque' | 'transparent'
  // Visibility hint
  visibility?: 'default' | 'public' | 'private' | 'confidential'
  reminders?: {
    useDefault: boolean
  }
  // Used to carry linkage to a platform event across syncs
  extendedProperties?: {
    private?: Record<string, string>
    shared?: Record<string, string>
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
  customName?: string
  accessToken: string
  refreshToken?: string
  color: string
  connectedAt: string
  hideDetails?: boolean
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
        'https://www.googleapis.com/auth/calendar.readonly',
        // Needed to validate token and get email/name for the account
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid'
      ]
    }
  }

  // Normalize various datetime representations to Schedule-X friendly format: "YYYY-MM-DD HH:mm"
  private static normalizeToScheduleX(dateInput?: string): string {
    try {
      if (!dateInput) return ''
      // Already in desired format "YYYY-MM-DD HH:mm"
      if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(dateInput)) return dateInput
      // Date-only → midnight local
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return `${dateInput} 00:00`
      // ISO or other parseable formats → convert to local and strip seconds/timezone
      const parsed = new Date(dateInput)
      if (isNaN(parsed.getTime())) return ''
      const y = parsed.getFullYear()
      const m = String(parsed.getMonth() + 1).padStart(2, '0')
      const d = String(parsed.getDate()).padStart(2, '0')
      const hh = String(parsed.getHours()).padStart(2, '0')
      const mm = String(parsed.getMinutes()).padStart(2, '0')
      return `${y}-${m}-${d} ${hh}:${mm}`
    } catch {
      return ''
    }
  }

  // Convert a local "YYYY-MM-DD HH:mm" (or similar) to RFC3339 with local offset
  private static normalizeToRfc3339(dateInput?: string): string {
    if (!dateInput) return new Date().toISOString()
    // If it already looks like RFC3339, return as-is
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(dateInput)) {
      return dateInput
    }
    let date: Date
    // "YYYY-MM-DD HH:mm"
    const m = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})$/)
    if (m) {
      const [_, y, mo, d, hh, mm] = m
      // Construct local time
      date = new Date(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), 0, 0)
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      // Date-only → local midnight
      const [y, mo, d] = dateInput.split('-').map(n => Number(n))
      date = new Date(y, mo - 1, d, 0, 0, 0, 0)
    } else {
      // Fallback to Date parser for any other input
      date = new Date(dateInput)
    }
    if (isNaN(date.getTime())) return new Date().toISOString()

    const pad = (n: number) => String(n).padStart(2, '0')
    const y = date.getFullYear()
    const mo = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    const hh = pad(date.getHours())
    const mm = pad(date.getMinutes())
    const ss = pad(date.getSeconds())
    // Local timezone offset in minutes; getTimezoneOffset returns minutes behind UTC
    const offsetMin = -date.getTimezoneOffset()
    const sign = offsetMin >= 0 ? '+' : '-'
    const abs = Math.abs(offsetMin)
    const offH = pad(Math.floor(abs / 60))
    const offM = pad(abs % 60)
    return `${y}-${mo}-${d}T${hh}:${mm}:${ss}${sign}${offH}:${offM}`
  }

  // Generic authorized fetch with 401 refresh-and-retry
  private async fetchWithAuth(accountId: string, url: string, init: RequestInit = {}) {
    const account = this.accounts.get(accountId)
    const accessToken = account?.accessToken
    if (!accessToken) throw new Error('Calendar not initialized. Please authenticate first.')

    const withAuth = (token: string) => ({
      ...init,
      headers: {
        ...(init.headers || {}),
        'Authorization': `Bearer ${token}`,
        ...(init.headers && (init.headers as any)['Content-Type'] ? {} : (init.body ? { 'Content-Type': 'application/json' } : {}))
      }
    })

    let response = await fetch(url, withAuth(accessToken))
    if (response.status === 401 && account?.refreshToken) {
      try {
        const newTokens = await this.refreshAccessTokenWithServer(account.refreshToken)
        account.accessToken = newTokens.access_token
        if (newTokens.refresh_token) account.refreshToken = newTokens.refresh_token
        this.accounts.set(account.id, account)
        this.saveAccountsToStorage()
        response = await fetch(url, withAuth(account.accessToken))
      } catch (e) {
        console.error('Unable to refresh token on 401:', e)
      }
    }
    return response
  }

  // Generate authorization URL for user to grant permissions
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true'
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
      // Use OIDC userinfo endpoint
      const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
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
      console.log('User info received:', { sub: userInfo.sub, email: userInfo.email, name: userInfo.name })
      
      // Generate a unique color for this account
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']
      const color = colors[this.accounts.size % colors.length]
      
      const account: GoogleCalendarAccount = {
        id: userInfo.sub || userInfo.id,
        email: userInfo.email,
        name: userInfo.name || userInfo.email,
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

  // Attempt to refresh an access token using server endpoint
  private async refreshAccessTokenWithServer(refreshToken: string) {
    const resp = await fetch('/api/google-calendar/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })
    if (!resp.ok) {
      const t = await resp.text()
      throw new Error(`Failed to refresh access token: ${resp.status} ${resp.statusText} ${t}`)
    }
    const data = await resp.json()
    if (!data.tokens?.access_token) throw new Error('No access token in refresh response')
    return data.tokens
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
          // Ensure defaults
          const normalized: GoogleCalendarAccount = {
            ...account,
            hideDetails: typeof account.hideDetails === 'boolean' ? account.hideDetails : false,
            customName: account.customName || undefined,
          }
          this.accounts.set(account.id, normalized)
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
      // Notify other parts of the app within this tab
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('googleCalendarAccountsUpdated'))
      }
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

  // Update account color
  setAccountColor(accountId: string, color: string) {
    const acc = this.accounts.get(accountId)
    if (!acc) return
    acc.color = color
    this.accounts.set(accountId, acc)
    this.saveAccountsToStorage()
  }

  // Update account custom display name
  setAccountName(accountId: string, customName: string) {
    const acc = this.accounts.get(accountId)
    if (!acc) return
    acc.customName = customName
    this.accounts.set(accountId, acc)
    this.saveAccountsToStorage()
  }

  // Update account hide details preference
  setAccountHideDetails(accountId: string, hide: boolean) {
    const acc = this.accounts.get(accountId)
    if (!acc) return
    acc.hideDetails = hide
    this.accounts.set(accountId, acc)
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
          console.log('Access token likely expired; attempting refresh...')
          const account = this.accounts.get(accountId)
          const rt = account?.refreshToken
          if (rt) {
            try {
              const newTokens = await this.refreshAccessTokenWithServer(rt)
              // Update token and retry once
              if (account) {
                account.accessToken = newTokens.access_token
                if (newTokens.refresh_token) account.refreshToken = newTokens.refresh_token
                this.accounts.set(account.id, account)
                this.saveAccountsToStorage()
              }
              const retry = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { 'Authorization': `Bearer ${newTokens.access_token}` }
              })
              if (!retry.ok) {
                const retryText = await retry.text()
                console.error('Retry after refresh failed:', retry.status, retry.statusText, retryText)
                throw new Error(`Retry failed: ${retry.status} ${retry.statusText}`)
              }
              const retryData = await retry.json()
              console.log('Test connection successful after refresh:', retryData)
              return retryData
            } catch (e) {
              console.error('Token refresh failed:', e)
            }
          }
          console.log('Token is invalid and refresh not possible; removing account')
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
      
      const response = await this.fetchWithAuth(accountId, url)

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
      const response = await this.fetchWithAuth(accountId, 'https://www.googleapis.com/calendar/v3/users/me/calendarList')

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
      // Normalize and validate payload before sending
      const summary = (event.summary && String(event.summary).trim()) || 'Workout'
      const startIso = GoogleCalendarService.normalizeToRfc3339(event.start?.dateTime)
      let endIso = GoogleCalendarService.normalizeToRfc3339(event.end?.dateTime)
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const startDate = new Date(startIso)
      let endDate = new Date(endIso)
      if (!(endDate.getTime() > startDate.getTime())) {
        endDate = new Date(startDate.getTime() + 30 * 60 * 1000)
        endIso = endDate.toISOString()
      }

      const safeEvent: GoogleCalendarEvent = {
        summary,
        description: event.description || '',
        start: { dateTime: startIso, timeZone: tz },
        end: { dateTime: endIso, timeZone: tz },
        location: event.location || undefined,
        attendees: Array.isArray(event.attendees)
          ? event.attendees
              .filter(a => a && a.email)
              .map(a => ({ email: a.email, displayName: a.displayName }))
          : undefined,
        transparency: event.transparency,
        visibility: event.visibility,
        reminders: event.reminders ?? { useDefault: true },
        extendedProperties: event.extendedProperties && (Object.keys(event.extendedProperties.private || {}).length > 0 || Object.keys(event.extendedProperties.shared || {}).length > 0)
          ? event.extendedProperties
          : undefined
      }

      const response = await this.fetchWithAuth(
        accountId,
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        { method: 'POST', body: JSON.stringify(safeEvent) }
      )

      if (!response.ok) {
        let detail = ''
        try { detail = await response.text() } catch {}
        throw new Error(`Failed to create event: ${response.status} ${response.statusText} ${detail}`)
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
      // Normalize provided times if present and ensure end > start when both provided
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const startIso = event.start?.dateTime ? GoogleCalendarService.normalizeToRfc3339(event.start.dateTime) : undefined
      let endIso = event.end?.dateTime ? GoogleCalendarService.normalizeToRfc3339(event.end.dateTime) : undefined
      if (startIso && endIso) {
        const s = new Date(startIso)
        let e = new Date(endIso)
        if (!(e.getTime() > s.getTime())) {
          e = new Date(s.getTime() + 30 * 60 * 1000)
          endIso = e.toISOString()
        }
      }

      const safeEvent: Partial<GoogleCalendarEvent> = {
        ...(event.summary !== undefined ? { summary: (event.summary || 'Workout') as string } : {}),
        ...(event.description !== undefined ? { description: event.description || '' } : {}),
        ...(startIso ? { start: { dateTime: startIso, timeZone: tz } } : {}),
        ...(endIso ? { end: { dateTime: endIso, timeZone: tz } } : {}),
        ...(event.location !== undefined ? { location: event.location } : {}),
        ...(Array.isArray(event.attendees) ? { attendees: event.attendees.filter(a => a && a.email).map(a => ({ email: a.email, displayName: a.displayName })) } : {}),
        ...(event.transparency !== undefined ? { transparency: event.transparency } : {}),
        ...(event.visibility !== undefined ? { visibility: event.visibility } : {}),
        ...(event.reminders !== undefined ? { reminders: event.reminders } : {}),
        ...(event.extendedProperties !== undefined ? { extendedProperties: event.extendedProperties } : {})
      }

      const response = await this.fetchWithAuth(
        accountId,
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        { method: 'PUT', body: JSON.stringify(safeEvent) }
      )

      if (!response.ok) {
        let detail = ''
        try { detail = await response.text() } catch {}
        throw new Error(`Failed to update event: ${response.status} ${response.statusText} ${detail}`)
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
      const response = await this.fetchWithAuth(
        accountId,
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        { method: 'DELETE' }
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
    const title = (scheduleXEvent.title && String(scheduleXEvent.title).trim()) || 'Workout'
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const startIso = GoogleCalendarService.normalizeToRfc3339(scheduleXEvent.start)
    let endIso = GoogleCalendarService.normalizeToRfc3339(scheduleXEvent.end)
    const s = new Date(startIso)
    let e = new Date(endIso)
    if (!(e.getTime() > s.getTime())) {
      e = new Date(s.getTime() + 30 * 60 * 1000)
      endIso = e.toISOString()
    }

    const attendees = Array.isArray(scheduleXEvent.attendees)
      ? scheduleXEvent.attendees
          .filter((a: any) => a && a.email)
          .map((a: any) => ({ email: a.email, displayName: a.name }))
      : undefined

    const extendedPrivate: Record<string, string> = scheduleXEvent.id ? { platformEventId: String(scheduleXEvent.id) } : {}

    // Mark water events as task-like for downstream filtering/UX
    if (scheduleXEvent.kind === 'water') {
      extendedPrivate['platformKind'] = 'water'
      extendedPrivate['platformCalendarItemType'] = 'task'
    }
    if (scheduleXEvent.kind === 'sleep') {
      extendedPrivate['platformKind'] = 'sleep'
    }

    return {
      summary: title,
      description: scheduleXEvent.description || '',
      start: { dateTime: startIso, timeZone: tz },
      end: { dateTime: endIso, timeZone: tz },
      location: scheduleXEvent.location || undefined,
      attendees,
      // Show task-like (water) as free time and private by default
      transparency: scheduleXEvent.kind === 'water' ? 'transparent' : undefined,
      visibility: scheduleXEvent.kind === 'water' ? 'private' : undefined,
      reminders: { useDefault: true },
      extendedProperties: Object.keys(extendedPrivate).length > 0 ? { private: extendedPrivate } : undefined
    }
  }

  // Convert Google Calendar event to schedule-x format
  convertFromGoogleEvent(googleEvent: any) {
    return {
      id: googleEvent.id,
      title: googleEvent.summary,
      start: GoogleCalendarService.normalizeToScheduleX(googleEvent.start?.dateTime || googleEvent.start?.date),
      end: GoogleCalendarService.normalizeToScheduleX(googleEvent.end?.dateTime || googleEvent.end?.date),
      description: googleEvent.description,
      location: googleEvent.location,
      attendees: googleEvent.attendees?.map((attendee: any) => ({
        email: attendee.email,
        name: attendee.displayName || attendee.email
      })) || [],
      googleEventId: googleEvent.id,
      accountId: googleEvent._accountId,
      accountEmail: googleEvent._accountEmail,
      accountColor: googleEvent._accountColor,
      platformEventId: googleEvent?.extendedProperties?.private?.platformEventId
    }
  }
}

export default GoogleCalendarService

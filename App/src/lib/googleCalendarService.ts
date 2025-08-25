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

class GoogleCalendarService {
  private config: GoogleCalendarConfig
  private accessToken: string | null = null

  constructor(config: GoogleCalendarConfig) {
    this.config = config
  }

  // Generate authorization URL for user to grant permissions
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  // Handle the authorization callback
  async handleAuthCallback(code: string) {
    try {
      const response = await fetch('/api/google-calendar/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code })
      })

      if (!response.ok) {
        throw new Error('Failed to exchange code for tokens')
      }

      const data = await response.json()
      this.accessToken = data.tokens.access_token
      
      // Store tokens in localStorage
      localStorage.setItem('googleCalendarTokens', JSON.stringify(data.tokens))
      
      return data.tokens
    } catch (error) {
      console.error('Error handling auth callback:', error)
      throw error
    }
  }

  // Set tokens (for when user is already authenticated)
  setTokens(tokens: any) {
    this.accessToken = tokens.access_token
  }

  // Fetch events from Google Calendar
  async getEvents(calendarId: string = 'primary', timeMin?: string, timeMax?: string) {
    if (!this.accessToken) {
      throw new Error('Calendar not initialized. Please authenticate first.')
    }

    try {
      const params = new URLSearchParams({
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        singleEvents: 'true',
        orderBy: 'startTime'
      })

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`)
      }

      const data = await response.json()
      return data.items || []
    } catch (error) {
      console.error('Error fetching events:', error)
      throw error
    }
  }

  // Create event in Google Calendar
  async createEvent(event: GoogleCalendarEvent, calendarId: string = 'primary') {
    if (!this.accessToken) {
      throw new Error('Calendar not initialized. Please authenticate first.')
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
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

  // Update event in Google Calendar
  async updateEvent(eventId: string, event: Partial<GoogleCalendarEvent>, calendarId: string = 'primary') {
    if (!this.accessToken) {
      throw new Error('Calendar not initialized. Please authenticate first.')
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
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

  // Delete event from Google Calendar
  async deleteEvent(eventId: string, calendarId: string = 'primary') {
    if (!this.accessToken) {
      throw new Error('Calendar not initialized. Please authenticate first.')
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
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
      googleEventId: googleEvent.id
    }
  }
}

export default GoogleCalendarService

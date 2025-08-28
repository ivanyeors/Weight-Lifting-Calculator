"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, RefreshCw, LogOut, AlertCircle, CheckCircle } from 'lucide-react'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'

interface GoogleCalendarSyncProps {
  onEventsSync?: (events: any[]) => void
  onEventCreate?: (event: any) => void
  onEventUpdate?: (eventId: string, event: any) => void
  onEventDelete?: (eventId: string) => void
}

export function GoogleCalendarSync({ 
  onEventsSync, 
  onEventCreate, 
  onEventUpdate, 
  onEventDelete 
}: GoogleCalendarSyncProps) {
  const [authCode, setAuthCode] = useState<string>('')
  const [isConnecting, setIsConnecting] = useState(false)

  const {
    isAuthenticated,
    isLoading,
    error,
    events,
    accounts,
    getAuthUrl,
    handleAuthCallback,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    removeAccount,
    logout,
    convertToGoogleEvent,
    convertFromGoogleEvent
  } = useGoogleCalendar({ autoSync: true })

  // Handle OAuth callback from sessionStorage
  useEffect(() => {
    // Check for Google Calendar OAuth code in sessionStorage
    const code = sessionStorage.getItem('googleCalendarCode')
    const state = sessionStorage.getItem('googleCalendarState')
    const error = new URLSearchParams(window.location.search).get('error')

    if (code && !isAuthenticated) {
      // Clear the stored code
      sessionStorage.removeItem('googleCalendarCode')
      sessionStorage.removeItem('googleCalendarState')
      
      // Handle the authentication
      setAuthCode(code)
      handleAuth(code, state || undefined)
        .then(() => {
          // Force a re-fetch of events after successful authentication
          setTimeout(() => {
            fetchEvents()
          }, 500)
        })
        .catch((error) => {
          console.error('Authentication failed:', error)
        })
    }

    if (error) {
      console.error('OAuth error:', error)
      // Clean up error parameter
      const newUrl = window.location.pathname + (window.location.hash || '')
      window.history.replaceState({}, document.title, newUrl)
    }
  }, [isAuthenticated, handleAuthCallback])

  const handleAuth = async (code: string, state?: string) => {
    setIsConnecting(true)
    try {
      await handleAuthCallback(code, state)
      setAuthCode('')
    } catch (error) {
      console.error('Authentication failed:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleConnect = () => {
    // Redirect to account page with calendar sync tab 
    const accountUrl = '/account?tab=calendar'
    const authUrl = getAuthUrl(accountUrl)
    window.location.href = authUrl
  }

  const handleSync = async () => {
    try {
      const syncedEvents = await fetchEvents()
      onEventsSync?.(syncedEvents.map(convertFromGoogleEvent))
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  const handleCreateInGoogle = async (scheduleXEvent: any) => {
    try {
      const googleEvent = convertToGoogleEvent(scheduleXEvent)
      // Use the first account for now - could be enhanced to let user choose
      const firstAccount = accounts[0]
      if (!firstAccount) {
        throw new Error('No Google Calendar account connected')
      }
      const createdEvent = await createEvent(firstAccount.id, googleEvent)
      onEventCreate?.(convertFromGoogleEvent(createdEvent))
    } catch (error) {
      console.error('Failed to create event in Google Calendar:', error)
    }
  }

  const handleUpdateInGoogle = async (eventId: string, scheduleXEvent: any) => {
    try {
      const googleEvent = convertToGoogleEvent(scheduleXEvent)
      // Use the first account for now - could be enhanced to let user choose
      const firstAccount = accounts[0]
      if (!firstAccount) {
        throw new Error('No Google Calendar account connected')
      }
      const updatedEvent = await updateEvent(firstAccount.id, eventId, googleEvent)
      onEventUpdate?.(eventId, convertFromGoogleEvent(updatedEvent))
    } catch (error) {
      console.error('Failed to update event in Google Calendar:', error)
    }
  }

  const handleDeleteInGoogle = async (eventId: string) => {
    try {
      // Use the first account for now - could be enhanced to let user choose
      const firstAccount = accounts[0]
      if (!firstAccount) {
        throw new Error('No Google Calendar account connected')
      }
      await deleteEvent(firstAccount.id, eventId)
      onEventDelete?.(eventId)
    } catch (error) {
      console.error('Failed to delete event in Google Calendar:', error)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Google Calendar Sync
        </CardTitle>
        <CardDescription>
          Connect your Google Calendar to sync workout sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <Badge variant="secondary" className="text-green-700 bg-green-100">
                  Connected
                </Badge>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <Badge variant="secondary" className="text-orange-700 bg-orange-100">
                  Disconnected
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Connection Actions */}
        {!isAuthenticated ? (
          <div className="space-y-2">
            <Button 
              onClick={handleConnect}
              disabled={isConnecting || isLoading}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Connect Google Calendar
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to Google to authorize access
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Button 
              onClick={handleSync}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Events
                </>
              )}
            </Button>
            
            <Button 
              onClick={logout}
              variant="outline"
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect
            </Button>

            {/* Sync Info */}
            <div className="text-xs text-muted-foreground text-center">
              {events.length > 0 ? (
                <span>Synced {events.length} events</span>
              ) : (
                <span>No events synced yet</span>
              )}
            </div>
          </div>
        )}

        {/* Manual Auth Code Input (for testing) */}
        {!isAuthenticated && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Or enter authorization code manually:
            </div>
            <input
              type="text"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="Enter authorization code"
              className="w-full px-3 py-2 text-sm border rounded-md"
            />
            <Button 
              onClick={() => handleAuth(authCode)}
              disabled={!authCode || isConnecting}
              size="sm"
              className="w-full"
            >
              Authenticate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

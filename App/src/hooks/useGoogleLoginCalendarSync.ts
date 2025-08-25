import { useEffect, useState } from 'react'
import { useGoogleCalendar } from './useGoogleCalendar'

interface UseGoogleLoginCalendarSyncOptions {
  autoConnectOnGoogleLogin?: boolean
  requestCalendarAccess?: boolean
}

export function useGoogleLoginCalendarSync(options: UseGoogleLoginCalendarSyncOptions = {}) {
  const { autoConnectOnGoogleLogin = true, requestCalendarAccess = true } = options
  
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false)
  const [calendarAccessRequested, setCalendarAccessRequested] = useState(false)

  const {
    isAuthenticated: isCalendarConnected,
    getAuthUrl,
    handleAuthCallback,
    error: calendarError
  } = useGoogleCalendar()

  // Check if user is logged in with Google
  useEffect(() => {
    // This would typically check your authentication state
    // For now, we'll simulate this by checking for Google OAuth tokens
    const checkGoogleLogin = () => {
      // Check if user has Google OAuth tokens (this depends on your auth implementation)
      const hasGoogleTokens = localStorage.getItem('googleAuthTokens') || 
                             localStorage.getItem('googleUser') ||
                             document.cookie.includes('google_auth')
      
      setIsGoogleLoggedIn(!!hasGoogleTokens)
    }

    checkGoogleLogin()
    
    // Listen for auth state changes
    const handleStorageChange = () => {
      checkGoogleLogin()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Automatically request calendar access when Google login is detected
  useEffect(() => {
    if (autoConnectOnGoogleLogin && 
        isGoogleLoggedIn && 
        !isCalendarConnected && 
        !calendarAccessRequested &&
        requestCalendarAccess) {
      
      setCalendarAccessRequested(true)
      
      // Show a prompt to connect Google Calendar
      const shouldConnect = window.confirm(
        'You\'re logged in with Google! Would you like to also connect your Google Calendar to sync your workout sessions?'
      )
      
      if (shouldConnect) {
        // Redirect to Google Calendar authorization
        const authUrl = getAuthUrl()
        window.location.href = authUrl
      }
    }
  }, [
    autoConnectOnGoogleLogin, 
    isGoogleLoggedIn, 
    isCalendarConnected, 
    calendarAccessRequested, 
    requestCalendarAccess,
    getAuthUrl
  ])

  // Handle OAuth callback for calendar access
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const error = urlParams.get('error')

    if (code && !isCalendarConnected) {
      handleAuthCallback(code)
        .then(() => {
          // Clean up URL parameters
          const newUrl = window.location.pathname
          window.history.replaceState({}, document.title, newUrl)
        })
        .catch((error) => {
          console.error('Failed to connect Google Calendar:', error)
        })
    }

    if (error) {
      console.error('Google Calendar OAuth error:', error)
      // Clean up URL parameters
      const newUrl = window.location.pathname
      window.history.replaceState({}, document.title, newUrl)
    }
  }, [isCalendarConnected, handleAuthCallback])

  return {
    isGoogleLoggedIn,
    isCalendarConnected,
    calendarAccessRequested,
    calendarError,
    requestCalendarAccess: () => {
      setCalendarAccessRequested(true)
      const authUrl = getAuthUrl()
      window.location.href = authUrl
    }
  }
}

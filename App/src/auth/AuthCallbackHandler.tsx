import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function AuthCallbackHandler() {
  useEffect(() => {
    const handleCallback = async () => {
      if (window.location.pathname.endsWith('/auth/callback')) {
        try {
          await supabase.auth.exchangeCodeForSession(window.location.href)
        } catch (error) {
          console.error('Supabase OAuth callback error:', error)
        } finally {
          const fallback = (import.meta.env.BASE_URL || '/') as string
          const redirectTo = sessionStorage.getItem('postAuthRedirectTo') || fallback
          sessionStorage.removeItem('postAuthRedirectTo')
          window.location.replace(redirectTo)
        }
      }
    }

    handleCallback()
  }, [])

  return null
}



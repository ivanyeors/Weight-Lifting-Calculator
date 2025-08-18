import { useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface AuthCallbackHandlerProps {
  children: ReactNode
}

export function AuthCallbackHandler({ children }: AuthCallbackHandlerProps) {
  useEffect(() => {
    const handleCallback = async () => {
      // Normalize pathname to include possible basePath from Next.js
      const basePath = (process.env.NEXT_PUBLIC_BASE_URL || '/') as string
      // Ensure basePath starts with '/' and has trailing slash handling similar to next.config.js
      const normalizedBase = basePath.startsWith('/') ? basePath : `/${basePath}`
      const callbackPath = `${normalizedBase.replace(/\/$/, '')}/auth/callback`.replace(/\/+/g, '/').replace(/\/\/$/, '/')

      const currentPath = window.location.pathname.endsWith('/') ? window.location.pathname : `${window.location.pathname}/`

      if (currentPath.endsWith('/auth/callback/') || currentPath === callbackPath) {
        try {
          await supabase.auth.exchangeCodeForSession(window.location.href)
        } catch (error) {
          console.error('Supabase OAuth callback error:', error)
        } finally {
          const fallback = (process.env.NEXT_PUBLIC_BASE_URL || '/') as string
          const redirectTo = sessionStorage.getItem('postAuthRedirectTo') || fallback
          sessionStorage.removeItem('postAuthRedirectTo')
          window.location.replace(redirectTo)
        }
      }
    }

    handleCallback()
  }, [])

  return <>{children}</>
}



'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
  useEffect(() => {
    const handleCallback = async () => {
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

    handleCallback()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">
        <p className="text-lg font-medium">Signing you in…</p>
        <p className="text-sm text-muted-foreground mt-1">Please wait while we complete authentication.</p>
      </div>
    </div>
  )
}



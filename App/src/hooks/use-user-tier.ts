import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { canUserToggleTheme, getAllowedThemes, getDefaultTheme } from '@/lib/plans'

export type UserTier = 'Free' | 'Personal' | 'Trainer'

export function useUserTier() {
  const [currentTier, setCurrentTier] = useState<UserTier>('Free')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsub: (() => void) | null = null
    
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user ?? null
      
      if (user) {
        setUserId(user.id)
        const planFromMeta = (user.user_metadata?.plan as string | undefined) || null
        const planFromStorage = typeof window !== 'undefined' 
          ? ((localStorage.getItem('fitspo:plan') as string | null) || (localStorage.getItem('stronk:plan') as string | null))
          : null
        
        const tier = (planFromMeta || planFromStorage || 'Free') as UserTier
        setCurrentTier(tier)
      } else {
        setCurrentTier('Free')
      }
      
      setLoading(false)

      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        const u = s?.user
        if (u) {
          setUserId(u.id)
          const uPlan = (u.user_metadata?.plan as string | undefined) || null
          const lsPlan = typeof window !== 'undefined' 
            ? ((localStorage.getItem('fitspo:plan') as string | null) || (localStorage.getItem('stronk:plan') as string | null))
            : null
          const tier = (uPlan || lsPlan || 'Free') as UserTier
          setCurrentTier(tier)
        } else {
          setUserId(null)
          setCurrentTier('Free')
        }
      })
      
      unsub = () => sub.subscription.unsubscribe()
    }
    
    void init()
    return () => { if (unsub) unsub() }
  }, [])

  const canToggleTheme = canUserToggleTheme(currentTier)
  const allowedThemes = getAllowedThemes(currentTier)
  const defaultTheme = getDefaultTheme(currentTier)

  return {
    currentTier,
    userId,
    loading,
    canToggleTheme,
    allowedThemes,
    defaultTheme,
    isPaidTier: currentTier === 'Personal' || currentTier === 'Trainer'
  }
}

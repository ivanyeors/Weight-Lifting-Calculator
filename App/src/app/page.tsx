"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { checkOnboardingStatus, isOnboardingComplete } from '@/lib/onboarding'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const redirectUser = async () => {
      try {
        // First check if onboarding is marked as complete in localStorage (fast check)
        if (isOnboardingComplete()) {
          router.replace('/plans/workout-plans')
          return
        }

        // If not marked complete, do a full check
        const status = await checkOnboardingStatus()

        if (status.isComplete) {
          // Mark as complete for future fast checks
          localStorage.setItem('fitspo:onboarding_complete', 'true')
          localStorage.setItem('fitspo:onboarding_completed_at', new Date().toISOString())
          router.replace('/plans/workout-plans')
        } else {
          router.replace('/onboard')
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error)
        // Default to onboarding if there's an error
        router.replace('/onboard')
      }
    }

    redirectUser()
  }, [router])

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

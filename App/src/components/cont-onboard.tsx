"use client"

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { X, ArrowRight, Info } from 'lucide-react'

export function ContOnboardAlert() {
  const [isVisible, setIsVisible] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check if onboarding has been completed globally
    const onboardingComplete = localStorage.getItem('fitspo:onboarding_complete')

    // If onboarding is complete, don't show the alert at all
    if (onboardingComplete === 'true') {
      setIsVisible(false)
      return
    }

    // Create page-specific storage key
    const pageKey = pathname.replace('/', '').replace(/\//g, '-') || 'home'
    const storageKey = `cont-onboard-dismissed-${pageKey}`

    // Check if the alert has been dismissed for this specific page
    const dismissed = localStorage.getItem(storageKey)
    if (!dismissed) {
      setIsVisible(true)
    }
  }, [pathname])

  const handleGoToOnboarding = () => {
    router.push('/onboard')
  }

  const handleDismiss = () => {
    setIsVisible(false)

    // Create page-specific storage key for dismissal
    const pageKey = pathname.replace('/', '').replace(/\//g, '-') || 'home'
    const storageKey = `cont-onboard-dismissed-${pageKey}`
    localStorage.setItem(storageKey, 'true')
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Alert className="shadow-sm">
        <Info className="text-primary" />
        <AlertTitle className="font-semibold">Complete your setup</AlertTitle>
        <AlertDescription>
          Finish setting up your fitness profile to get personalized workout recommendations and track your progress effectively.
        </AlertDescription>
        <div className="col-start-2 mt-3 flex items-center gap-2">
          <Button size="sm" onClick={handleGoToOnboarding}>
            Go to Onboarding
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="ml-auto"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    </div>
  )
}

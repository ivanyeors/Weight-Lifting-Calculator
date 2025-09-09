"use client"

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type ConsentState = 'granted' | 'denied'

const STORAGE_KEY = 'consent.v2'

function updateGtagConsent(state: ConsentState) {
  if (typeof window === 'undefined') return
  // Ensure gtag function exists (provided by GA/GTM or our defaults initializer)
  ;(window as any).dataLayer = (window as any).dataLayer || []
  const gtag = (...args: any[]) => (window as any).dataLayer.push(args)

  gtag('consent', 'update', {
    ad_user_data: state,
    ad_personalization: state,
    ad_storage: state,
    analytics_storage: state,
  })

  if (state === 'granted') {
    gtag('set', 'ads_data_redaction', false)
  }
}

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'granted' || saved === 'denied') {
        updateGtagConsent(saved)
        setVisible(false)
      } else {
        setVisible(true)
      }
    } catch {
      setVisible(true)
    }
  }, [])

  const handle = (state: ConsentState) => {
    try { localStorage.setItem(STORAGE_KEY, state) } catch {}
    updateGtagConsent(state)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className={cn(
      'fixed inset-x-0 bottom-0 z-50 flex justify-center p-4'
    )}>
      <Card className="w-full max-w-2xl border-muted bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="p-4 md:p-6">
          <p className="text-sm text-muted-foreground">
            We use cookies and similar technologies for analytics and advertising. Choose whether we may collect data for these purposes. You can change your choice anytime in account settings.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => handle('denied')}>
              Deny
            </Button>
            <Button onClick={() => handle('granted')}>
              Allow all
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}



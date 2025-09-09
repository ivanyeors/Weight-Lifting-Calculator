"use client"

import { PricingPlansClient } from '@/app/billing/pricing-plans-client'
import { plans } from '@/lib/plans'
import { Navbar01 } from '@/components/ui/shadcn-io/navbar-01'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { ArrowLeft } from 'lucide-react'

export default function PricingPage() {
  const router = useRouter()
  const { theme, resolvedTheme } = useTheme()

  // Navigation links for navbar
  const navigationLinks = [
    { href: '/fitspo-app', label: 'App' },
    { href: '/home#platform', label: 'Platform' },
    { href: '/home/pricing', label: 'Pricing', active: true },
  ]

  const handleNavigationClick = (link: { href: string; label: string }) => {
    if (link.href === '/fitspo-app') {
      router.push('/fitspo-app')
    } else if (link.href.startsWith('/home#')) {
      router.push('/home')
      // Scroll to section after navigation
      setTimeout(() => {
        const id = link.href.split('#')[1]
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } else {
      router.push(link.href)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <Navbar01
        logo={
          <img
            src={(resolvedTheme || theme) === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'}
            alt="Fitspo Logo"
            className="h-8 w-8"
          />
        }
        logoHref="/home"
        navigationLinks={navigationLinks}
        signInText="Sign In"
        signInHref="#signin"
        ctaText="Get Started"
        ctaHref="#get-started"
        onSignInClick={() => router.push('/account')}
        onCtaClick={() => router.push('/onboard')}
        onNavigationClick={handleNavigationClick}
      />

      {/* Pricing Content */}
      <div className="pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Unlock more features and customize your experience with our flexible pricing plans.
            </p>
          </div>
          <PricingPlansClient plans={plans} />
        </div>
      </div>
    </div>
  )
}

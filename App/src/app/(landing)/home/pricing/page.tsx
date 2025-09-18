"use client"

import { useEffect, useState } from 'react'
import { PricingPlansClient } from '@/app/billing/pricing-plans-client'
import { plans } from '@/lib/plans'
import { Navbar01 } from '@/components/ui/shadcn-io/navbar-01'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { FeatureComparisonTable } from './feature-comparison-table'
import { LoginSheet } from '@/components/auth/LoginSheet'
import { supabase } from '@/lib/supabaseClient'

export default function PricingPage() {
  const router = useRouter()
  const { theme, resolvedTheme } = useTheme()
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let unsub: (() => void) | undefined
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session?.user)
      } catch {
        setIsAuthenticated(false)
      }
    }
    void check()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session?.user)
      if (session?.user) {
        setIsLoginOpen(false)
        try {
          const completed = typeof window !== 'undefined' && localStorage.getItem('fitspo:onboarding_complete') === 'true'
          router.replace(completed ? '/home' : '/onboard')
        } catch {
          router.replace('/onboard')
        }
      }
    })
    unsub = () => subscription.unsubscribe()
    return () => { unsub?.() }
  }, [router])

  // Navigation links for navbar
  const navigationLinks = [
    { href: '/home#platform', label: 'Platform' },
    { href: '/fitspo-app', label: 'App' },
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
        signInText={isAuthenticated ? 'Account' : 'Sign In'}
        signInHref={isAuthenticated ? '/account' : '#signin'}
        ctaText={isAuthenticated ? 'Dashboard' : 'Get Started'}
        ctaHref={isAuthenticated ? '/onboard' : '#get-started'}
        onSignInClick={() => {
          if (isAuthenticated) router.push('/account'); else setIsLoginOpen(true)
        }}
        onCtaClick={() => {
          if (isAuthenticated) router.push('/onboard'); else setIsLoginOpen(true)
        }}
        onNavigationClick={handleNavigationClick}
      />

      {/* Header Section */}
      <section className="py-16 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Choose Your Fitness Journey
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Unlock your full potential with our comprehensive fitness platform.
            Choose the plan that fits your goals, from basic calculations to advanced
            training analytics and client management.
          </p>
        </div>
      </section>

      {/* Pricing Content */}
      <div className="pt-6 pb-12">
        <div className="container mx-auto px-4">
          <PricingPlansClient plans={plans} />

          {/* View All Features Button */}
          <div className="mt-16 text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const element = document.getElementById('feature-comparison');
                element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="px-8 py-3"
            >
              View All Plans Features
            </Button>
          </div>
        </div>
      </div>

      {/* Feature Comparison Section */}
      <section id="feature-comparison" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Compare All Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Detailed comparison of all features across our pricing plans
            </p>
          </div>
          <FeatureComparisonTable plans={plans} />
        </div>
      </section>
      <LoginSheet open={isLoginOpen} onOpenChange={setIsLoginOpen} onSuccess={() => setIsLoginOpen(false)} />
    </div>
  )
}

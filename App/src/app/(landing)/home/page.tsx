"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar01 } from '@/components/ui/shadcn-io/navbar-01'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { FlickeringGrid } from '@/components/ui/shadcn-io/flickering-grid'
import { LoginForm } from '@/app/account/login-form'
import { useTheme } from 'next-themes'
import { supabase } from '@/lib/supabaseClient'
import {
  Calculator,
  MapPin,
  Dumbbell,
  Target,
  Users,
  TrendingUp,
  Award,
  ArrowRight,
  CheckCircle
} from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const { theme, resolvedTheme } = useTheme()
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session?.user)

        // If authenticated, redirect to onboard
        if (session?.user) {
          router.replace('/onboard')
          return
        }
      } catch (error) {
        console.error('Error checking auth status:', error)
        setIsAuthenticated(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user)
      if (session?.user) {
        setIsLoginOpen(false)
        router.replace('/onboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  // Navigation links for navbar
  const navigationLinks = [
    { href: '/fitspo-app', label: 'App' },
    { href: '/home#platform', label: 'Platform' },
  ]

  const handleGetStarted = () => {
    setIsLoginOpen(true)
  }

  const handleSignIn = () => {
    setIsLoginOpen(true)
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
        onSignInClick={(e?: any) => {
          if (isAuthenticated) {
            router.push('/account')
          } else {
            handleSignIn()
          }
        }}
        onCtaClick={() => {
          if (isAuthenticated) {
            router.push('/onboard')
          } else {
            handleGetStarted()
          }
        }}
        onNavigationClick={(link) => {
          if (link.href === '/fitspo-app') {
            router.push('/fitspo-app')
          } else if (link.href.startsWith('/home#')) {
            const id = link.href.split('#')[1]
            const el = document.getElementById(id)
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          } else {
            router.push(link.href)
          }
        }}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        {/* Background Effects */}
        <div className="absolute inset-0 -z-10">
          <FlickeringGrid
            squareSize={4}
            gridGap={6}
            flickerChance={0.3}
            color="#283DFF"
            maxOpacity={0.3}
            className="w-full h-full"
          />
        </div>

        <div className="mx-auto max-w-7xl text-center">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Your Personal
              <span className="text-primary"> Fitness Calculator</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Get personalized fitness recommendations based on your body composition, experience level, and goals.
              Transform your fitness journey with data-driven insights.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg" onClick={handleGetStarted} className="px-8">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" className="px-8">
                Learn More
              </Button>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                  <Calculator className="h-8 w-8 text-primary" />
                </div>
                <dt className="text-base font-semibold leading-7 text-foreground">
                  Smart Calculations
                </dt>
                <dd className="mt-1 text-base leading-7 text-muted-foreground">
                  Advanced algorithms calculate optimal weights, reps, and rest times based on your profile.
                </dd>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <dt className="text-base font-semibold leading-7 text-foreground">
                  Personalized Goals
                </dt>
                <dd className="mt-1 text-base leading-7 text-muted-foreground">
                  Set and track fitness goals with intelligent progress monitoring and adjustments.
                </dd>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <dt className="text-base font-semibold leading-7 text-foreground">
                  Progress Tracking
                </dt>
                <dd className="mt-1 text-base leading-7 text-muted-foreground">
                  Monitor your fitness journey with detailed analytics and performance insights.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="platform" className="py-24 sm:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need for your fitness journey
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Comprehensive tools and features designed to help you achieve your fitness goals efficiently.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
              <div className="flex flex-col">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold leading-8 text-foreground">
                  Exercise Library
                </h3>
                <p className="mt-2 text-base leading-7 text-muted-foreground">
                  Access thousands of exercises with detailed instructions, video guides, and equipment requirements.
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Video demonstrations
                  </li>
                  <li className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Equipment variations
                  </li>
                  <li className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Difficulty levels
                  </li>
                </ul>
              </div>

              <div className="flex flex-col">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold leading-8 text-foreground">
                  Workout Spaces
                </h3>
                <p className="mt-2 text-base leading-7 text-muted-foreground">
                  Define your training environment and get recommendations based on available equipment.
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Equipment inventory
                  </li>
                  <li className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Space optimization
                  </li>
                  <li className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Location tracking
                  </li>
                </ul>
              </div>

              <div className="flex flex-col">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold leading-8 text-foreground">
                  User Management
                </h3>
                <p className="mt-2 text-base leading-7 text-muted-foreground">
                  Manage multiple user profiles with individual body metrics, goals, and progress tracking.
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Body composition tracking
                  </li>
                  <li className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Goal setting
                  </li>
                  <li className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Progress analytics
                  </li>
                </ul>
              </div>

              <div className="flex flex-col">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold leading-8 text-foreground">
                  Smart Recommendations
                </h3>
                <p className="mt-2 text-base leading-7 text-muted-foreground">
                  AI-powered suggestions for workouts, nutrition, and recovery based on your data.
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Personalized workouts
                  </li>
                  <li className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Nutrition guidance
                  </li>
                  <li className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Recovery optimization
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Login Modal */}
      <Sheet open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <SheetContent
          side="bottom"
          animation="fade"
          className="p-0 inset-0 w-screen sm:h-dvh h-svh max-w-none rounded-none border-0 [&_[data-slot=sheet-close]]:z-[60]"
          overlayClassName="!bg-transparent"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sign In</SheetTitle>
          </SheetHeader>
          {/* Full-screen flickering grid background */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <FlickeringGrid
              squareSize={4}
              gridGap={6}
              flickerChance={0.3}
              color="#283DFF"
              maxOpacity={0.6}
              className="w-full h-full opacity-80"
            />
          </div>

          {/* Content overlay */}
          <div className="absolute inset-x-0 top-4 bottom-0 z-10 flex min-h-full flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
              <LoginForm onSuccess={() => setIsLoginOpen(false)} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

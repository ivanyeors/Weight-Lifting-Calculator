"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Smartphone, Target, TrendingUp, Users, Zap, CalendarDays, Dumbbell, Utensils, FolderTree, UserPlus, LayoutDashboard } from "lucide-react"
import Image from "next/image"
import heroImg from "@/assets/fitspo-platform-promo/platform.png"
import { Navbar01 } from "@/components/ui/shadcn-io/navbar-01"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { supabase } from "@/lib/supabaseClient"
import { LoginSheet } from "@/components/auth/LoginSheet"
import { FeatureSection } from "@/components/ui/feature-section"

// Trainer-tier feature demo video (placeholder from media folder)
// Using public path served by Next.js; autoplay requires muted + playsInline
const demoVideoSrc = "/assets/media/fitspo-fitness-plan.mp4"

export default function PlatformPage() {
  const router = useRouter()
  const { theme, resolvedTheme } = useTheme()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session?.user)
      } catch {
        setIsAuthenticated(false)
      }
    }
    void init()
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
    const unsub = () => subscription.unsubscribe()
    return () => { unsub() }
  }, [router])

  const handleRegisterInterest = async () => {
    const emailInput = document.getElementById('email-input') as HTMLInputElement
    const emailValue = emailInput?.value?.trim() || email

    if (!emailValue) {
      toast.error("Please enter your email address", { duration: 4000 })
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailValue)) {
      toast.error("Please enter a valid email address", { duration: 4000 })
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('fitspo_app_interested_users')
        .insert([{ email: emailValue, source: 'platform_page' }])
      if (error) {
        if (error.code === '23505') {
          toast.success("You're already registered! We'll notify you with updates.", { duration: 4000 })
        } else {
          console.error('Error registering interest:', error)
          toast.error("Something went wrong. Please try again later.", { duration: 4000 })
        }
      } else {
        toast.success("Thank you! We'll keep you posted.", { duration: 4000 })
        if (emailInput) emailInput.value = ""
        setEmail("")
      }
    } catch (error) {
      console.error('Error registering interest:', error)
      toast.error("Something went wrong. Please try again later.", { duration: 4000 })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Navigation links for navbar
  const navigationLinks = [
    { href: '/platform#platform', label: 'Platform', active: true },
    { href: '/fitspo-app', label: 'App' },
    { href: '/platform/pricing', label: 'Pricing' },
  ]

  const handleNavigationClick = (link: { href: string; label: string }) => {
    if (link.href === '/fitspo-app') {
      router.push('/fitspo-app')
    } else if (link.href.startsWith('/platform#')) {
      router.push('/platform')
      setTimeout(() => {
        const id = link.href.split('#')[1]
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } else {
      router.push(link.href)
    }
  }

  const features = [
    { key: 'calculator', title: 'Ideal weight lifting Calculator', description: 'Calculate optimal weights and reps with muscle involvement breakdowns.', icon: Dumbbell, cta: { href: '/ideal-exercise-weight', label: 'Try Calculator' } },
    { key: 'fitness-goal', title: 'Fitness Goal', description: 'Plan, track and visualize goals. Trainer gets trends from completed workouts.', icon: Target, cta: { href: '/fitness-goal', label: 'Create a Goal' } },
    { key: 'exercise-library', title: 'Exercise Library', description: 'Gym + Yoga Stretches with 2000+ growing database. Upload & sync videos (Trainer).', icon: LayoutDashboard, cta: { href: '/exercise-library', label: 'Browse Exercises' } },
    { key: 'ingredients', title: 'Ingredient Database', description: 'Up-to-date macros/micros and custom ingredients with cloud sync.', icon: Utensils, cta: { href: '/plans/nutrition', label: 'Open Ingredients' } },
    { key: 'recipes', title: 'Recipes & Nutrition Plans', description: 'Browse recipes, track macros/micros, and cloud inventory sync.', icon: TrendingUp, cta: { href: '/plans/nutrition', label: 'Plan Nutrition' } },
    { key: 'spaces', title: 'Workout spaces', description: 'Organize your training spaces. Unlimited on paid tiers.', icon: FolderTree, cta: { href: '/workout-spaces', label: 'Manage Spaces' } },
    { key: 'users', title: 'Managed users', description: 'Manage clients and profiles. Unlimited on paid tiers.', icon: UserPlus, cta: { href: '/plans/users', label: 'Manage Users' } },
    { key: 'calendar', title: 'Synced Calendar for Fitness Goal', description: 'Sync to Google Calendar. Personal: up to 2 accounts. Trainer: unlimited.', icon: CalendarDays, cta: { href: '/plans/workout-plans', label: 'Open Calendar' } },
    { key: 'team', title: 'Team Management Features', description: 'Trainer tier tools for teams and clients with fast switching.', icon: Users, cta: { href: '/home', label: 'See Teams' } },
  ] as const

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Top Navbar */}
      <Navbar01
        logo={
          <img
            src={(resolvedTheme || theme) === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'}
            alt="Fitspo Logo"
            className="h-8 w-8"
          />
        }
        logoHref="/"
        navigationLinks={navigationLinks}
        signInText={isAuthenticated ? 'Account' : 'Sign In'}
        signInHref={isAuthenticated ? '/account' : '#signin'}
        ctaText={isAuthenticated ? 'Enter' : 'Get Started'}
        ctaHref={isAuthenticated ? '/home' : '#get-started'}
        onSignInClick={() => { if (isAuthenticated) router.push('/account'); else setIsLoginOpen(true) }}
        onCtaClick={() => { if (isAuthenticated) router.push('/home'); else setIsLoginOpen(true) }}
        onNavigationClick={handleNavigationClick}
      />

      {/* Hero Section (image only, no overlays) */}
      <div className="w-full" id="platform">
        <Image
          src={heroImg}
          alt="Fitspo Platform hero"
          className="w-full h-auto object-cover"
          priority
        />
      </div>

      {/* Content Section below hero */}
      <div className="container mx-auto px-6 py-14 lg:py-20">
        <div className="max-w-4xl">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Smartphone className="w-4 h-4" />
                Web Platform
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Fitspo Platform
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Your all-in-one fitness platform: plan smarter workouts, track progress,
                and manage your journey with beautiful, fast tools.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-md">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    id="email-input"
                    disabled={isSubmitting}
                  />
                  <Button
                    size="default"
                    className="px-4 whitespace-nowrap"
                    onClick={handleRegisterInterest}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Notify Me"}
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                size="default"
                className="px-6"
                onClick={() => {
                  const featuresSection = document.getElementById('features')
                  if (featuresSection) {
                    featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }}
              >
                <Zap className="w-4 h-4 mr-2" />
                Learn More
              </Button>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Live on the Web
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                Free tier available
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trainer-focused Feature Sections */}
      <div id="features" className="container mx-auto px-6 py-20">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold">Trainer Tier Highlights</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built for coaches and power users. Each section shows the feature in action.
          </p>
        </div>

        <div className="space-y-12">
          {features.map((f, idx) => (
            <FeatureSection
              key={f.key}
              title={f.title}
              description={f.description}
              cta={f.cta}
              icon={f.icon}
              media={{ type: 'video', src: demoVideoSrc }}
              reverse={idx % 2 === 1}
            />
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 border-y">
        <div className="container mx-auto px-6 py-16">
          <div className="text-center space-y-6 max-w-2xl mx-auto">
            <h3 className="text-2xl lg:text-3xl font-bold">Jump into the Platform</h3>
            <p className="text-muted-foreground text-lg">
              Sign in to start planning your training and tracking your progress.
            </p>
            <Button
              size="default"
              className="px-6"
              onClick={() => { if (isAuthenticated) router.push('/home'); else setIsLoginOpen(true) }}
            >
              {isAuthenticated ? 'Enter Dashboard' : 'Get Started'}
            </Button>
          </div>
        </div>
      </div>
      <LoginSheet open={isLoginOpen} onOpenChange={setIsLoginOpen} onSuccess={() => setIsLoginOpen(false)} />
    </div>
  )
}



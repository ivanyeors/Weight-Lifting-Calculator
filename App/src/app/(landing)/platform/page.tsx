"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Smartphone, Target, TrendingUp, Users, Zap } from "lucide-react"
import Image from "next/image"
import heroImg from "@/assets/fitspoapp-promo/hero-img.png"
import { Navbar01 } from "@/components/ui/shadcn-io/navbar-01"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { supabase } from "@/lib/supabaseClient"
import { LoginSheet } from "@/components/auth/LoginSheet"

export default function PlatformPage() {
  const router = useRouter()
  const { theme, resolvedTheme } = useTheme()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let unsub: (() => void) | undefined
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
    unsub = () => subscription.unsubscribe()
    return () => { unsub?.() }
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
    { href: '/fitspo-app', label: 'App' },
    { href: '/platform#platform', label: 'Platform', active: true },
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
    {
      title: "Integrated Web Platform",
      description: "Access calculators, exercise library, goals, and calendars in one place.",
      icon: Target,
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center"
    },
    {
      title: "Progress & Insights",
      description: "Track your progress and get insights to optimize your training over time.",
      icon: TrendingUp,
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop&crop=center"
    },
    {
      title: "Multi-user Ready",
      description: "Built for personal use and trainers managing multiple users.",
      icon: Users,
      image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=300&fit=crop&crop=center"
    }
  ]

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

      {/* Features Section */}
      <div id="features" className="container mx-auto px-6 py-20">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold">Powerful Platform Features</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to plan, track, and succeed—beautifully integrated.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm">
                <CardHeader className="space-y-4">
                  <div className="w-full aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                              <${Icon.name} class="w-16 h-16 text-primary/60" />
                            </div>
                          `
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
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



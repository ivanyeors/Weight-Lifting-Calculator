"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Smartphone, Target, TrendingUp, Users, Heart, Zap } from "lucide-react"
import Image from "next/image"
import heroImg from "@/assets/fitspoapp-promo/hero-img.png"
import { Navbar01 } from "@/components/ui/shadcn-io/navbar-01"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { supabase } from "@/lib/supabaseClient"
import { useState } from "react"

export default function FitspoAppPage() {
  const router = useRouter()
  const { theme, resolvedTheme } = useTheme()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRegisterInterest = async () => {
    const emailInput = document.getElementById('email-input') as HTMLInputElement
    const emailValue = emailInput?.value?.trim() || email

    if (!emailValue) {
      toast.error("Please enter your email address", {
        duration: 4000,
      })
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailValue)) {
      toast.error("Please enter a valid email address", {
        duration: 4000,
      })
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('fitspo_app_interested_users')
        .insert([
          {
            email: emailValue,
            source: 'landing_page'
          }
        ])

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast.success("You're already registered! We'll notify you when Fitspo App launches.", {
            duration: 4000,
          })
        } else {
          console.error('Error registering interest:', error)
          toast.error("Something went wrong. Please try again later.", {
            duration: 4000,
          })
        }
      } else {
        toast.success("Thank you for your interest! We'll notify you when Fitspo App launches.", {
          duration: 4000,
        })
        // Clear the email input
        if (emailInput) emailInput.value = ""
        setEmail("")
      }
    } catch (error) {
      console.error('Error registering interest:', error)
      toast.error("Something went wrong. Please try again later.", {
        duration: 4000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Navigation links for navbar
  const navigationLinks = [
    { href: '/fitspo-app', label: 'App', active: true },
    { href: '/home#platform', label: 'Platform' },
    { href: '/home/pricing', label: 'Pricing' },
  ]

  const handleNavigationClick = (link: { href: string; label: string }) => {
    if (link.href === '/fitspo-app') {
      router.push('/fitspo-app')
    } else if (link.href.startsWith('/home#')) {
      router.push('/home')
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
      title: "Personalized Workout Plans",
      description: "AI-powered workout plans tailored to your fitness level, goals, and available equipment. Get the perfect routine every time.",
      icon: Target,
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center"
    },
    {
      title: "Smart Progress Tracking",
      description: "Track your workouts, monitor your progress, and get insights into your fitness journey with detailed analytics and visualizations.",
      icon: TrendingUp,
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop&crop=center"
    },
    {
      title: "Community & Motivation",
      description: "Connect with like-minded fitness enthusiasts, share your achievements, and stay motivated with our supportive community.",
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

      {/* Hero Section (image only, no overlays) */}
      <div className="w-full">
        <Image
          src={heroImg}
          alt="Fitspo App hero"
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
                Mobile App Coming Soon
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Fitspo App
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Your personal fitness companion. Coming soon to revolutionize the way you train, track, and transform.
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
                    <Heart className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Registering..." : "Register Interest"}
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
                Available only on iOS
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                Free to download
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="container mx-auto px-6 py-20">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold">Powerful Features</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to achieve your fitness goals, all in one beautiful app.
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
                        // Fallback to icon if image fails to load
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
            <h3 className="text-2xl lg:text-3xl font-bold">Be the first to know when we launch</h3>
            <p className="text-muted-foreground text-lg">
              Join thousands of fitness enthusiasts who are excited about the future of personal training.
            </p>
            <Button
              size="default"
              className="px-6"
              onClick={handleRegisterInterest}
            >
              <Heart className="w-4 h-4 mr-2" />
              Register Your Interest
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}



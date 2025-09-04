"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Smartphone, Target, TrendingUp, Users, Heart, Zap } from "lucide-react"
import Image from "next/image"
import heroImg from "@/assets/fitspoapp-promo/hero-img.png"

export default function FitspoAppPage() {
  const handleRegisterInterest = () => {
    toast.success("Thank you for your interest! We'll notify you when Fitspo App launches.", {
      duration: 4000,
    })
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

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="default"
                className="px-6"
                onClick={handleRegisterInterest}
              >
                <Heart className="w-4 h-4 mr-2" />
                Register Interest
              </Button>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 border bg-background shadow-xs px-6 h-9"
              >
                <Zap className="w-4 h-4" />
                Learn More
              </a>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Available on iOS & Android
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



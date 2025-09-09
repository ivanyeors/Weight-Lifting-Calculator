"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { supabase } from '@/lib/supabaseClient'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BadgeCheck } from 'lucide-react'
import { LoginForm } from '@/app/account/login-form'
import { FlickeringGrid } from '@/components/ui/shadcn-io/flickering-grid'
import type { Plan } from '@/lib/plans'

// Use shared `Plan` type from `lib/plans`

export function PricingPlansClient({ plans }: { plans: Plan[] }) {
  const router = useRouter()
  const [currentPlan, setCurrentPlan] = useState<string>('Free')
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [isLoginOpen, setIsLoginOpen] = useState(false)

  useEffect(() => {
    let unsub: (() => void) | null = null
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      const u = data.session?.user ?? null
      setUserId(u?.id ?? null)
      setEmail(u?.email ?? null)
      const metaPlan = (data.session?.user?.user_metadata?.plan as string | undefined) || null
      const storedPlan = typeof window !== 'undefined'
        ? ((localStorage.getItem('fitspo:plan') as string | null) || (localStorage.getItem('stronk:plan') as string | null))
        : null
      setCurrentPlan(metaPlan || storedPlan || 'Free')

      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        const user = s?.user
        setUserId(user?.id ?? null)
        setEmail(user?.email ?? null)
        const uPlan = (user?.user_metadata?.plan as string | undefined) || null
        const lsPlan = typeof window !== 'undefined'
          ? ((localStorage.getItem('fitspo:plan') as string | null) || (localStorage.getItem('stronk:plan') as string | null))
          : null
        setCurrentPlan(uPlan || lsPlan || 'Free')
      })
      unsub = () => sub.subscription.unsubscribe()
    }
    void init()
    return () => { if (unsub) unsub() }
  }, [])

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`

  const getDisplayPrice = (plan: Plan) => {
    // Handle free plan specially
    if (plan.price.toLowerCase() === 'free') {
      return { price: 'Free', period: plan.period }
    }
    
    const monthly = parseFloat((plan.price || '').replace(/[^0-9.]/g, '')) || 0
    if (billing !== 'annual') {
      return { price: formatCurrency(monthly), period: '/mo' }
    }
    // When billed annually, display the discounted monthly equivalent
    // Prefer using configured yearlyPrice for accuracy with Stripe, fallback to 40% off monthly
    let discountedMonthly: number
    if (plan.yearlyPrice) {
      const yearlyConfigured = parseFloat((plan.yearlyPrice || '').replace(/[^0-9.]/g, '')) || 0
      discountedMonthly = yearlyConfigured / 12
    } else {
      discountedMonthly = monthly * 0.6 // 40% off annually
    }
    return { price: formatCurrency(discountedMonthly), period: '/mo' }
  }

  return (
    <div className="flex flex-col gap-16 text-center">
      <div className="flex flex-col items-center justify-center gap-8">
        <div className="flex flex-col items-center justify-center gap-8">
          <Tabs value={billing} onValueChange={(v) => setBilling((v as 'monthly' | 'annual'))}>
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="annual">
                Annually
                <Badge variant="secondary" className="ml-2">save 40%</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="w-full">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
        const isCurrent = plan.name.toLowerCase() === currentPlan.toLowerCase()
        const display = getDisplayPrice(plan)
        const isFree = plan.price.toLowerCase() === 'free'
        const baseHref = billing === 'annual' && plan.yearlyHref ? plan.yearlyHref : plan.href
        const hrefWithParams = !isFree && userId
          ? `${baseHref}${baseHref.includes('?') ? '&' : '?'}client_reference_id=${encodeURIComponent(`${userId}|${plan.name}|${billing}`)}${email ? `&prefilled_email=${encodeURIComponent(email)}` : ''}`
          : baseHref
        const isUserOnHighestPlan = currentPlan.toLowerCase() === 'trainer'
        const shouldShowSwitchCta = isUserOnHighestPlan && (plan.name === 'Personal' || plan.name === 'Free') && !isCurrent
        const ctaLabel = shouldShowSwitchCta ? 'Switch plan' : plan.cta
        return (
          <Card key={plan.name} className={(plan.highlighted ? 'ring-2 ring-primary border-primary/50 shadow-md bg-gradient-to-b from-primary/5 to-card ' : '') + 'relative flex h-full flex-col'}>
            {plan.highlighted && (
              <Badge className="-translate-x-1/2 -translate-y-1/2 absolute top-0 left-1/2 rounded-full bg-primary text-primary-foreground">
                Most popular
              </Badge>
            )}
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                </div>
                <div className="flex gap-2">
                  {isCurrent && (
                    <Badge variant="secondary">Current plan</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {plan.description && (
                <CardDescription className="mb-4">{plan.description}</CardDescription>
              )}
              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{display.price}</span>
                  <span className="text-muted-foreground">{display.period}</span>
                </div>
              </div>
              <div className="space-y-2">
                {plan.features.map((f, index) => (
                  <div
                    className="flex items-center gap-2 text-muted-foreground text-sm"
                    key={index}
                  >
                    <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="mt-auto">
              {isCurrent ? (
                <Button className="w-full" variant="outline" disabled>
                  Current plan
                </Button>
              ) : !userId ? (
                /* User not signed in - show login modal */
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "secondary"}
                  onClick={() => setIsLoginOpen(true)}
                >
                  Select Plan
                </Button>
              ) : (
                /* User signed in - use actual Stripe links or redirect to account for free */
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "secondary"}
                  asChild
                >
                  <a href={isFree ? '/account?tab=billing' : hrefWithParams}>
                    {isFree ? 'Manage Plan' : 'Select Plan'}
                  </a>
                </Button>
              )}
            </CardFooter>
          </Card>
        )
      })}
          </div>
        </div>
      </div>

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
              <LoginForm
                onSuccess={() => {
                  setIsLoginOpen(false)
                  // After successful login, redirect to account page with billing tab
                  setTimeout(() => {
                    router.push('/account?tab=billing')
                  }, 100)
                }}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}



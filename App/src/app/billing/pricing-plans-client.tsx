"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
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
import { supabase } from '@/lib/supabaseClient'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Plan } from '@/lib/plans'

// Use shared `Plan` type from `lib/plans`

export function PricingPlansClient({ plans }: { plans: Plan[] }) {
  const [currentPlan, setCurrentPlan] = useState<string>('Free')
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div className="md:col-span-2 lg:col-span-3 flex items-center justify-end gap-3">
        <Tabs value={billing} onValueChange={(v) => setBilling((v as 'monthly' | 'annual'))}>
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annual">Annually</TabsTrigger>
          </TabsList>
        </Tabs>
        <Label className="text-xs text-green-600 whitespace-nowrap">save 40% annually</Label>
      </div>
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
          <Card key={plan.name} className={(plan.highlighted ? 'border-primary/50 shadow-md bg-gradient-to-b from-primary/5 to-card ' : '') + 'flex h-full flex-col'}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                </div>
                <div className="flex gap-2">
                  {plan.highlighted && (
                    <Badge>Most popular</Badge>
                  )}
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
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 rounded-full bg-primary/70" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="mt-auto">
              {isCurrent ? (
                <Button className="w-full" variant="outline" disabled>
                  Current plan
                </Button>
              ) : (
                <>
                  {!isFree && !userId ? (
                    <Button className="w-full" asChild>
                      <Link href={`/account?tab=billing`}>Sign in to subscribe</Link>
                    </Button>
                  ) : (
                    <Button className="w-full" asChild>
                      <Link href={hrefWithParams}>{ctaLabel}</Link>
                    </Button>
                  )}
                </>
              )}
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}



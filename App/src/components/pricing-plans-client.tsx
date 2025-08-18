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

type Plan = {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  href: string
  highlighted?: boolean
}

export function PricingPlansClient({ plans }: { plans: Plan[] }) {
  const [currentPlan, setCurrentPlan] = useState<string>('Free')
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  useEffect(() => {
    let unsub: (() => void) | null = null
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      const metaPlan = (data.session?.user?.user_metadata?.plan as string | undefined) || null
      const storedPlan = typeof window !== 'undefined' ? (localStorage.getItem('stronk:plan') as string | null) : null
      setCurrentPlan(metaPlan || storedPlan || 'Free')

      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        const uPlan = (s?.user?.user_metadata?.plan as string | undefined) || null
        const lsPlan = typeof window !== 'undefined' ? (localStorage.getItem('stronk:plan') as string | null) : null
        setCurrentPlan(uPlan || lsPlan || 'Free')
      })
      unsub = () => sub.subscription.unsubscribe()
    }
    void init()
    return () => { if (unsub) unsub() }
  }, [])

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`

  const getDisplayPrice = (plan: Plan) => {
    const monthly = parseFloat((plan.price || '').replace(/[^0-9.]/g, '')) || 0
    if (billing !== 'annual') {
      return { price: formatCurrency(monthly), period: '/mo' }
    }
    const yearly = monthly * 12 * 0.6 // 40% off annually
    return { price: formatCurrency(yearly), period: '/yr' }
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
        return (
          <Card key={plan.name} className={(plan.highlighted ? 'border-primary/50 shadow-md bg-gradient-to-b from-primary/5 to-card ' : '') + 'flex h-full flex-col'}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
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
                <Button className="w-full" asChild>
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              )}
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}



import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PricingPlansClient } from '@/components/pricing-plans-client'
import { plans } from '@/lib/plans'

export const metadata: Metadata = {
  title: 'Pricing — Weight Lifting Calculator',
  description: 'Choose the plan that fits your training goals.',
}

// plans imported from lib

export default function PricingPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" asChild>
          <Link href="/">← Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pricing</h1>
          <p className="text-sm text-muted-foreground">Choose a plan that fits your goals.</p>
        </div>
      </div>

      <PricingPlansClient plans={plans} />
    </div>
  )
}



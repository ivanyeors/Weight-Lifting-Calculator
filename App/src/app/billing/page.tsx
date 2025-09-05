import { PricingPlansClient } from '@/app/billing/pricing-plans-client'
import { plans } from '@/lib/plans'

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Billing & Plans</h1>
          <p className="text-lg text-muted-foreground">
            Manage your subscription and billing preferences
          </p>
        </div>
        <PricingPlansClient plans={plans} />
      </div>
    </div>
  )
}

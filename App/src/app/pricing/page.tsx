import { PricingPlansClient } from '@/components/pricing-plans-client'
import { plans } from '@/lib/plans'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground">
            Unlock more features and customize your experience
          </p>
        </div>
        <PricingPlansClient plans={plans} />
      </div>
    </div>
  )
}

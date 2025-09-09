"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, Check, X, BadgeCheck } from 'lucide-react'
import { Plan } from '@/lib/plans'

// Extended feature data with descriptions
const extendedFeatures = [
  {
    name: 'Core Fitness Calculator',
    description: 'Access to our main exercise weight calculator with basic functionality for calculating optimal weights and reps.',
    free: true,
    personal: true,
    trainer: true
  },
  {
    name: 'Exercise Library Access',
    description: 'Browse our extensive database of exercises with video demonstrations and detailed instructions.',
    free: true,
    personal: true,
    trainer: true
  },
  {
    name: 'Muscle Involvement Breakdowns',
    description: 'Detailed analysis showing which muscles are targeted by each exercise with percentage involvement.',
    free: true,
    personal: true,
    trainer: true
  },
  {
    name: 'Basic Exercise Videos',
    description: 'Access to video demonstrations for exercises to ensure proper form and technique.',
    free: true,
    personal: true,
    trainer: true
  },
  {
    name: 'Data Saved in Account',
    description: 'All your fitness data, calculations, and preferences are securely saved to your personal account.',
    free: false,
    personal: true,
    trainer: true
  },
  {
    name: 'SMM + BFM Calculations',
    description: 'Advanced body composition calculations including Skeletal Muscle Mass and Body Fat Mass tracking.',
    free: false,
    personal: true,
    trainer: true
  },
  {
    name: 'YouTube Exercise Search',
    description: 'Search and integrate exercise videos directly from YouTube for comprehensive workout guidance.',
    free: false,
    personal: true,
    trainer: true
  },
  {
    name: 'Theme Customization',
    description: 'Choose between light and dark themes, with automatic system theme detection.',
    free: false,
    personal: true,
    trainer: true
  },
  {
    name: 'Expanded Exercise Database',
    description: 'Access to 2000+ additional exercises covering specialized categories and advanced training methods.',
    free: false,
    personal: false,
    trainer: true
  },
  {
    name: 'Multi-User/Client Management',
    description: 'Manage multiple user profiles and client data for personal training and group management.',
    free: false,
    personal: false,
    trainer: true
  },
  {
    name: 'Advanced Analytics',
    description: 'Detailed progress tracking, performance analytics, and comprehensive reporting tools.',
    free: false,
    personal: false,
    trainer: true
  },
  {
    name: 'Priority Support',
    description: 'Get faster response times and priority access to customer support with dedicated account management.',
    free: false,
    personal: false,
    trainer: true
  }
]

interface FeatureComparisonTableProps {
  plans: Plan[]
}

export function FeatureComparisonTable({ plans }: FeatureComparisonTableProps) {
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set())

  const toggleFeature = (featureName: string) => {
    const newExpanded = new Set(expandedFeatures)
    if (newExpanded.has(featureName)) {
      newExpanded.delete(featureName)
    } else {
      newExpanded.add(featureName)
    }
    setExpandedFeatures(newExpanded)
  }

  return (
    <Card className="w-full">
      <CardHeader className="px-4 md:px-6">
        <CardTitle className="text-center text-xl md:text-2xl">Feature Comparison</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Header Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border-b bg-muted/50">
          <div className="p-4 md:p-6 font-semibold text-left">Features</div>
          {plans.map((plan, index) => (
            <div key={plan.name} className="p-4 md:p-6 text-center md:col-span-1">
              <div className="flex flex-col items-center gap-2">
                <h3 className="font-semibold text-base md:text-lg">{plan.name}</h3>
                {plan.highlighted && (
                  <Badge className="bg-primary text-primary-foreground text-xs md:text-sm">Most Popular</Badge>
                )}
                <div className="text-xl md:text-2xl font-bold">
                  {plan.price.toLowerCase() === 'free' ? 'Free' : `$${plan.price}`}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">{plan.period}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Rows */}
        {extendedFeatures.map((feature, index) => (
          <div key={feature.name} className="border-b last:border-b-0">
            <Collapsible>
              <CollapsibleTrigger
                className="w-full"
                onClick={() => toggleFeature(feature.name)}
              >
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 hover:bg-muted/30 transition-colors ${
                  expandedFeatures.has(feature.name) ? 'bg-muted/20' : ''
                }`}>
                  <div className="p-4 md:p-6 text-left flex items-center">
                    <ChevronDown
                      className={`h-4 w-4 transition-transform mr-2 ${
                        expandedFeatures.has(feature.name) ? 'rotate-180' : ''
                      }`}
                    />
                    <span className="font-medium text-sm md:text-base">{feature.name}</span>
                  </div>
                  <div className="p-4 md:p-6 flex items-center justify-center">
                    {feature.free ? (
                      <BadgeCheck className="h-5 w-5 text-green-600" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="p-4 md:p-6 flex items-center justify-center">
                    {feature.personal ? (
                      <BadgeCheck className="h-5 w-5 text-green-600" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="p-4 md:p-6 flex items-center justify-center">
                    {feature.trainer ? (
                      <BadgeCheck className="h-5 w-5 text-green-600" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 md:px-6 pb-4 md:pb-6">
                  <div className="bg-muted/30 rounded-lg p-3 md:p-4">
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ))}

        {/* CTA Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 p-4 md:p-6 bg-muted/20">
          <div className="font-semibold text-sm md:text-base flex items-center">Select Plan</div>
          {plans.map((plan) => (
            <div key={plan.name} className="flex justify-center mt-2 md:mt-0">
                <Button
                  variant={plan.highlighted ? "default" : "outline"}
                  size="sm"
                  className="w-full md:w-auto text-xs md:text-sm"
                  onClick={() => {
                    // Redirect to the pricing page where proper authentication and Stripe link handling occurs
                    window.location.href = '/home/pricing'
                  }}
                >
                  Select Plan
                </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

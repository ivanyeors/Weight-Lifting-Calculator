"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, Check, X, BadgeCheck } from 'lucide-react'
import { Plan } from '@/lib/plans'

// Extended feature data aligned with tier-list.md
const extendedFeatures = [
  {
    name: 'Ideal Weight Lifting Calculator',
    description: 'Calculate optimal weights and reps. Includes detailed muscle involvement breakdowns.',
    free: true,
    personal: true,
    trainer: true,
  },
  {
    name: 'Fitness Goal',
    description: 'Plan and track your goals. Free: limited. Personal/Trainer: unlimited goals.',
    free: true,
    personal: true,
    trainer: true,
  },
  {
    name: 'Exercise Library: Gym Exercises',
    description: 'Browse core gym exercises.',
    free: true,
    personal: true,
    trainer: true,
  },
  {
    name: 'Exercise Library: Yoga Stretches',
    description: 'Unlock additional categories like Yoga Stretches.',
    free: false,
    personal: true,
    trainer: true,
  },
  {
    name: 'Custom Exercises (Local)',
    description: 'Create custom exercises saved locally on your device (Free).',
    free: true,
    personal: false,
    trainer: false,
  },
  {
    name: 'Custom Exercises (Synced)',
    description: 'Create custom exercises synced to your account (Personal/Trainer).',
    free: false,
    personal: true,
    trainer: true,
  },
  {
    name: 'Exercise Videos (YouTube Search)',
    description: 'Search exercise videos via YouTube directly in the Exercise Library.',
    free: false,
    personal: true,
    trainer: true,
  },
  {
    name: 'Upload & Sync Exercise Videos',
    description: 'Upload your own exercise videos and sync them across devices (Trainer).',
    free: false,
    personal: false,
    trainer: true,
  },
  {
    name: 'Ingredient Database Access',
    description: 'Access ingredient data. Personal/Trainer get ongoing updates.',
    free: true,
    personal: true,
    trainer: true,
  },
  {
    name: 'Ingredient Updates + Add Custom Ingredients',
    description: 'Receive ingredient updates and add your own custom ingredients (synced).',
    free: false,
    personal: true,
    trainer: true,
  },
  {
    name: 'Recipes & Nutrition (Local)',
    description: 'Browse recipes and compute local macros/micros with local inventory (Free).',
    free: true,
    personal: false,
    trainer: false,
  },
  {
    name: 'Nutrition Updates + Cloud Inventory Sync',
    description: 'Get recipe and macro/micro updates with cloud inventory sync (Personal/Trainer).',
    free: false,
    personal: true,
    trainer: true,
  },
  {
    name: 'Workout Spaces',
    description: 'Create workout spaces. Free: limited. Personal/Trainer: unlimited.',
    free: true,
    personal: true,
    trainer: true,
  },
  {
    name: 'Managed Users',
    description: 'Manage users/clients. Free: limited. Personal/Trainer: unlimited.',
    free: true,
    personal: true,
    trainer: true,
  },
  {
    name: 'Workout Templates',
    description: 'Free up to 9 templates. Personal/Trainer: unlimited templates.',
    free: true,
    personal: true,
    trainer: true,
  },
  {
    name: 'Local Calendar',
    description: 'Local-only calendar for Fitness Goal on the Free plan.',
    free: true,
    personal: false,
    trainer: false,
  },
  {
    name: 'Synced Calendar (Google)',
    description: 'Sync Fitness Goal with Google Calendar. Personal: up to 2 accounts. Trainer: unlimited.',
    free: false,
    personal: true,
    trainer: true,
  },
  {
    name: 'Theme Customization',
    description: 'Light & Dark with system detection (Personal/Trainer). Free: dark theme only.',
    free: false,
    personal: true,
    trainer: true,
  },
  {
    name: 'Exercise Trend',
    description: 'See exercise trends based on completed workouts (Trainer).',
    free: false,
    personal: false,
    trainer: true,
  },
  {
    name: 'Expanded Exercise Database (+2000)',
    description: 'Access to an expanded and growing exercise database (Trainer).',
    free: false,
    personal: false,
    trainer: true,
  },
  {
    name: 'Team Management Features',
    description: 'Tools for managing teams and clients (Trainer).',
    free: false,
    personal: false,
    trainer: true,
  },
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
        {/* Mobile: sticky plan header with 4-column grid (feature + 3 plans) */}
        <div className="md:hidden">
          {/* Header Row (sticky) */}
          <div className="grid [grid-template-columns:minmax(160px,1fr)_repeat(3,64px)] gap-0 border-b sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="p-3 font-semibold text-left">Features</div>
            {plans.map((plan) => (
              <div key={plan.name} className="p-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="font-semibold text-xs">{plan.name}</span>
                  {plan.highlighted && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] leading-3">Popular</Badge>
                  )}
                  <span className="text-sm font-bold">
                    {plan.price.toLowerCase() === 'free' ? 'Free' : `$${plan.price}`}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Feature Rows */}
          {extendedFeatures.map((feature) => (
            <div key={feature.name} className="border-b last:border-b-0">
              <Collapsible>
                <CollapsibleTrigger
                  className="w-full"
                  onClick={() => toggleFeature(feature.name)}
                >
                  <div className={`grid [grid-template-columns:minmax(160px,1fr)_repeat(3,64px)] gap-0 hover:bg-muted/30 transition-colors ${
                    expandedFeatures.has(feature.name) ? 'bg-muted/20' : ''
                  }`}>
                    <div className="p-4 text-left flex items-center">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform mr-2 ${
                          expandedFeatures.has(feature.name) ? 'rotate-180' : ''
                        }`}
                      />
                      <span className="font-medium text-sm">{feature.name}</span>
                    </div>
                    <div className="p-4 flex items-center justify-center">
                      {feature.free ? (
                        <BadgeCheck className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="p-4 flex items-center justify-center">
                      {feature.personal ? (
                        <BadgeCheck className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="p-4 flex items-center justify-center">
                      {feature.trainer ? (
                        <BadgeCheck className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}

          {/* CTA Row */}
          <div className="grid [grid-template-columns:minmax(160px,1fr)_repeat(3,64px)] gap-0 p-4 bg-muted/20">
            <div className="font-semibold text-sm flex items-center">Select Plan</div>
            {plans.map((plan) => (
              <div key={plan.name} className="flex justify-center">
                <Button
                  variant={plan.highlighted ? 'default' : 'outline'}
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    window.location.href = '/home/pricing'
                  }}
                >
                  Select
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop and tablet (unchanged layout) */}
        <div className="hidden md:block">
          {/* Header Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border-b bg-muted/50">
            <div className="p-4 md:p-6 font-semibold text-left">Features</div>
            {plans.map((plan) => (
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
          {extendedFeatures.map((feature) => (
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
                  variant={plan.highlighted ? 'default' : 'outline'}
                  size="sm"
                  className="w-full md:w-auto text-xs md:text-sm"
                  onClick={() => {
                    window.location.href = '/home/pricing'
                  }}
                >
                  Select Plan
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

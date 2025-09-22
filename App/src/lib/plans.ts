export type Plan = {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  href: string
  highlighted?: boolean
  yearlyPrice?: string
  yearlyHref?: string
  // Theme capabilities
  themeCapabilities: {
    canToggleTheme: boolean
    defaultTheme: 'light' | 'dark' | 'system'
    allowedThemes: ('light' | 'dark' | 'system')[]
  }
}

export const plans: Plan[] = [
  {
    name: 'Free',
    price: 'free',
    period: 'forever',
    description: 'Get started with the core calculator, gym exercises, and local-only features.',
    features: [
      'Ideal Weight Lifting Calculator',
      'Muscle involvement breakdowns',
      'Exercise Library: Gym Exercises',
      'Custom exercises (local only)',
      'Ingredient Database (read-only)',
      'Recipes & Nutrition: browse + local macros/micros + local inventory',
      'Fitness Goal (limited)',
      'Workout spaces (limited)',
      'Managed users (limited)',
      'Workout templates (up to 9)',
      'Local calendar (no Google sync)',
      'Dark theme only',
    ],
    cta: 'Get started',
    href: '/',
    themeCapabilities: {
      canToggleTheme: false,
      defaultTheme: 'dark',
      allowedThemes: ['dark']
    }
  },
  {
    name: 'Personal',
    price: '$5.99',
    period: '/mo',
    description: 'Unlock unlimited goals, synced data, YouTube videos, and full theme controls.',
    features: [
      'Everything in Free',
      'Fitness Goal (unlimited)',
      'Exercise Library Pro: Gym + Yoga Stretches',
      'Create custom exercises (synced)',
      'Exercise videos examples (YouTube search)',
      'Ingredient Database updates + add custom ingredients (synced)',
      'Nutrition updates: recipes + macros/micros + cloud inventory sync',
      'Workout spaces (unlimited)',
      'Managed users (unlimited)',
      'Synced Calendar: connect up to 2 Google accounts',
      'Theme customization: Light & Dark (system)',
    ],
    cta: 'Subscribe',
    href: 'https://buy.stripe.com/cNi3cudszgjt7481Rt0Ba02',
    yearlyPrice: '$43.00',
    yearlyHref: 'https://buy.stripe.com/8x24gy3RZ0kvewA2Vx0Ba01',
    highlighted: true,
    themeCapabilities: {
      canToggleTheme: true,
      defaultTheme: 'system',
      allowedThemes: ['light', 'dark', 'system']
    }
  },
  {
    name: 'Trainer',
    price: '$14.99',
    period: '/mo',
    description: 'Built for coaches: advanced library, uploads, team tools, and unlimited sync.',
    features: [
      'Everything in Personal',
      'Exercise Trend (based on completed workouts)',
      'Exercise Library Pro: +2000 growing exercises',
      'Upload & sync exercise videos',
      'Team management features',
      'Synced Calendar: connect unlimited Google accounts',
    ],
    cta: 'Subscribe',
    href: 'https://buy.stripe.com/4gMaEW2NV0kvewA1Rt0Ba03',
    yearlyPrice: '$108.00',
    yearlyHref: 'https://buy.stripe.com/00waEW2NVd7hewA9jV0Ba04',
    themeCapabilities: {
      canToggleTheme: true,
      defaultTheme: 'system',
      allowedThemes: ['light', 'dark', 'system']
    }
  },
]

// Helper function to get plan by name
export function getPlanByName(planName: string): Plan | undefined {
  return plans.find(plan => plan.name === planName)
}

// Helper function to check if user can toggle theme
export function canUserToggleTheme(planName: string): boolean {
  const plan = getPlanByName(planName)
  return plan?.themeCapabilities.canToggleTheme ?? false
}

// Helper function to get allowed themes for a plan
export function getAllowedThemes(planName: string): ('light' | 'dark' | 'system')[] {
  const plan = getPlanByName(planName)
  return plan?.themeCapabilities.allowedThemes ?? ['dark']
}

// Helper function to get default theme for a plan
export function getDefaultTheme(planName: string): 'light' | 'dark' | 'system' {
  const plan = getPlanByName(planName)
  return plan?.themeCapabilities.defaultTheme ?? 'dark'
}



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
    description: 'Great to explore the basics and try the calculator.',
    features: [
      'Core calculator features',
      'Access to base gym exercises',
      'Muscle involvement breakdowns',
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
    description: 'Useful for tracking your progress and getting personalized weight recommendations.',
    features: [
      'Everything in Free',
      'Data saved in account',
      'SMM + BFM metrics calculations',
      'Light + dark themes',
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
    description: 'For coaches, fitness trainers with multiple clients.',
    features: [
      'Everything in Personal',
      '+2000 growing exercises updates in other categories',
      'Save multiple users/clients configuration',
      'Light + dark themes',
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



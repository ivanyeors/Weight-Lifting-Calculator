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
      'Light + dark themes',
    ],
    cta: 'Get started',
    href: '/',
  },
  {
    name: 'Personal',
    price: '$5.99',
    period: '/mo',
    description: 'Useful for tracking your progress and getting personalized weight recommendations.',
    features: [
      'Everything in Free',
      'Data saved in account',
      'Priority improvements',
    ],
    cta: 'Subscribe',
    href: 'https://buy.stripe.com/cNi3cudszgjt7481Rt0Ba02',
    yearlyPrice: '$43.00',
    yearlyHref: 'https://buy.stripe.com/8x24gy3RZ0kvewA2Vx0Ba01',
    highlighted: true,
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
    ],
    cta: 'Subscribe',
    href: 'https://buy.stripe.com/4gMaEW2NV0kvewA1Rt0Ba03',
    yearlyPrice: '$108.00',
    yearlyHref: 'https://buy.stripe.com/00waEW2NVd7hewA9jV0Ba04',
  },
]



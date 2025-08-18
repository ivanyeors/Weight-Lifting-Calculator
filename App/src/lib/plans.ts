export type Plan = {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  href: string
  highlighted?: boolean
}

export const plans: Plan[] = [
  {
    name: 'Free',
    price: '0',
    period: '/mo',
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
    price: '$1.99',
    period: '/mo',
    description: 'Useful for tracking your progress and getting personalized weight recommendations.',
    features: [
      'All features in Free tier',
      'Data saved in account',
      'Priority improvements',
    ],
    cta: 'Choose Pro',
    href: '/account',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '$4.99',
    period: '/mo',
    description: 'For coaches, fitness trainers with multiple clients.',
    features: [
      'Everything in Pro',
      '+2000 growing exercises updates in other categories',
      'Save multiple users configuration',
    ],
    cta: 'Go Elite',
    href: '/account',
  },
]



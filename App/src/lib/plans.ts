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
    name: 'Bronze Tier',
    price: '$1.99',
    period: '/mo',
    description: 'Unlock the full experience and personalized insights.',
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
    name: 'Silver Tier',
    price: '$4.99',
    period: '/mo',
    description: 'For dedicated lifters who want more monitoring.',
    features: [
      'Everything in Pro',
      'Early access to new models',
      'Advanced tracking experiments',
    ],
    cta: 'Go Elite',
    href: '/account',
  },
]



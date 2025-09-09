import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fitspo — Fitness Calculator',
  description: 'Personalized fitness recommendations based on your body composition and experience level',
  manifest: '/site.webmanifest',
  themeColor: '#000000',
  icons: {
    icon: [
      { url: '/Fitspo-app-logo-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/Fitspo-app-logo-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/Fitspo-app-logo-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/Fitspo-app-logo-152.png', sizes: '152x152', type: 'image/png' }
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fitspo',
  },
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from "@vercel/analytics/next"
import { GoogleTagManager } from "@next/third-parties/google"
import Script from 'next/script'
import '../index.css'
import { ThemeProvider } from "@/app/theme-provider"
import { Toaster } from "@/components/ui/sonner"

import { AppShell } from "@/app/app-shell"
import { AuthCallbackHandler } from "@/auth/AuthCallbackHandler"
// Replaced bespoke GTM/GA with @next/third-parties implementations
import ConsentDefaults from "@/components/analytics/ConsentDefaults"
import ConsentBanner from "@/components/analytics/ConsentBanner"

const inter = Inter({ subsets: ['latin'] })

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID || 'G-6P9R4044ZG'
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ConsentDefaults />
        {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
        {gaId ? (
          <>
            <Script
              id="ga-gtag-script"
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="beforeInteractive"
            />
            <Script id="ga-gtag-init" strategy="beforeInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        ) : null}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AuthCallbackHandler>
            <AppShell>
              {children}
            </AppShell>
            <Toaster />
            <Analytics />
            <ConsentBanner />
          </AuthCallbackHandler>
        </ThemeProvider>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { type CSSProperties } from 'react'
import { Inter } from 'next/font/google'
import { Analytics } from "@vercel/analytics/next"
import '../index.css'
import { ThemeProvider } from "@/app/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/app/app-sidebar"
import { MobileDock } from "@/app/(globals)/mobile-dock"
import { AuthCallbackHandler } from "@/auth/AuthCallbackHandler"
import GTM from "@/components/analytics/GTM"
import GA from "@/components/analytics/GA"
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
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ConsentDefaults />
        <GTM />
        <GA />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthCallbackHandler>
            <SidebarProvider style={{ "--sidebar-width": "14rem" } as CSSProperties}>
              <AppSidebar />
              <SidebarInset>
                {children}
              </SidebarInset>
              {/* Global mobile dock so it's persistent across navigation */}
              <MobileDock />
            </SidebarProvider>
            <Toaster />
            <Analytics />
            <ConsentBanner />
          </AuthCallbackHandler>
        </ThemeProvider>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { type CSSProperties } from 'react'
import { Inter } from 'next/font/google'
import { Analytics } from "@vercel/analytics/next"
import '../index.css'
import { ThemeProvider } from "@/app/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/app/app-sidebar"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fitspo — Fitness Calculator',
  description: 'Personalized fitness recommendations based on your body composition and experience level',
  icons: {
    icon: '/logo-dark.svg',
    shortcut: '/logo-dark.svg',
    apple: '/logo-dark.svg',
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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SidebarProvider style={{ "--sidebar-width": "14rem" } as CSSProperties}>
            <AppSidebar />
            <SidebarInset>
              {children}
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}

"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Navbar01 } from '@/components/ui/shadcn-io/navbar-01'
import { useTheme } from 'next-themes'
import { LoginSheet } from '@/components/auth/LoginSheet'
import { supabase } from '@/lib/supabaseClient'

export default function PrivacyPage() {
  const router = useRouter()
  const { theme, resolvedTheme } = useTheme()
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let unsub: (() => void) | undefined
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session?.user)
      } catch {
        setIsAuthenticated(false)
      }
    }
    void check()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session?.user)
      if (session?.user) {
        setIsLoginOpen(false)
        try {
          const completed = typeof window !== 'undefined' && localStorage.getItem('fitspo:onboarding_complete') === 'true'
          router.replace(completed ? '/home' : '/onboard')
        } catch {
          router.replace('/onboard')
        }
      }
    })
    unsub = () => subscription.unsubscribe()
    return () => { unsub?.() }
  }, [router])

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <Navbar01
        logo={
          <img
            src={(resolvedTheme || theme) === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'}
            alt="Fitspo Logo"
            className="h-8 w-8"
          />
        }
        logoHref="/"
        navigationLinks={[
          { href: '/fitspo-app', label: 'App' },
          { href: '/platform#platform', label: 'Platform' },
        ]}
        signInText={isAuthenticated ? 'Account' : 'Sign In'}
        signInHref={isAuthenticated ? '/account' : '#signin'}
        ctaText={isAuthenticated ? 'Dashboard' : 'Get Started'}
        ctaHref={isAuthenticated ? '/onboard' : '#get-started'}
        onSignInClick={() => { if (isAuthenticated) router.push('/account'); else setIsLoginOpen(true) }}
        onCtaClick={() => { if (isAuthenticated) router.push('/onboard'); else setIsLoginOpen(true) }}
      />

      <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
      <div className="mt-6 space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold mb-3">1. Information We Collect</h2>
          <p className="text-muted-foreground mb-3">
            We collect information you provide directly to us, such as when you:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
            <li>Create an account or profile</li>
            <li>Use our fitness tracking and workout planning features</li>
            <li>Contact us for support</li>
            <li>Participate in surveys or promotions</li>
          </ul>
          <p className="text-muted-foreground mt-3">
            This may include your name, email address, password, fitness goals, workout data, and other information you choose to provide.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">2. Information We Collect Automatically</h2>
          <p className="text-muted-foreground mb-3">
            When you use our App, we automatically collect certain information, including:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
            <li>Device information (device type, operating system, browser type)</li>
            <li>Usage data (features used, time spent, pages visited)</li>
            <li>IP address and location information</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">3. How We Use Your Information</h2>
          <p className="text-muted-foreground mb-3">
            We use the information we collect to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
            <li>Provide, maintain, and improve our App and services</li>
            <li>Process and complete transactions</li>
            <li>Send you technical notices, updates, security alerts, and support messages</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Develop new features and services</li>
            <li>Monitor usage and analyze trends</li>
            <li>Personalize your experience</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">4. Information Sharing and Disclosure</h2>
          <p className="text-muted-foreground mb-3">
            We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
            <li>With your consent</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights and prevent fraud</li>
            <li>In connection with a business transfer or acquisition</li>
            <li>With service providers who assist our operations (under strict confidentiality agreements)</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">5. Data Security</h2>
          <p className="text-muted-foreground">
            We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">6. Data Retention</h2>
          <p className="text-muted-foreground">
            We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law. When we no longer need your information, we will securely delete or anonymize it.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">7. Your Rights and Choices</h2>
          <p className="text-muted-foreground mb-3">
            Depending on your location, you may have the following rights regarding your personal information:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
            <li>Access: Request a copy of the personal information we hold about you</li>
            <li>Correction: Request correction of inaccurate or incomplete information</li>
            <li>Deletion: Request deletion of your personal information</li>
            <li>Portability: Request transfer of your data to another service</li>
            <li>Opt-out: Opt out of certain data processing activities</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">8. Cookies and Tracking Technologies</h2>
          <p className="text-muted-foreground">
            We use cookies and similar technologies to enhance your experience, analyze usage, and assist in our marketing efforts. You can control cookie preferences through your browser settings, though disabling cookies may limit some functionality of our App.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">9. Third-Party Services</h2>
          <p className="text-muted-foreground">
            Our App may contain links to third-party websites or services. We are not responsible for the privacy practices or content of these third parties. We encourage you to review the privacy policies of any third-party services you use.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">10. Children's Privacy</h2>
          <p className="text-muted-foreground">
            Our App is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">11. Changes to This Privacy Policy</h2>
          <p className="text-muted-foreground">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of our App after any changes indicates your acceptance of the updated Privacy Policy.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">12. Contact Us</h2>
          <p className="text-muted-foreground">
            If you have any questions about this Privacy Policy or our privacy practices, please contact us at privacy@weightliftingcalculator.com.
          </p>
        </div>

        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
      <LoginSheet open={isLoginOpen} onOpenChange={setIsLoginOpen} onSuccess={() => setIsLoginOpen(false)} />
    </div>
  )
}





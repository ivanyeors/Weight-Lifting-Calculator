"use client"

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Navbar01 } from '@/components/ui/shadcn-io/navbar-01'
import { useTheme } from 'next-themes'

export default function TermsPage() {
  const router = useRouter()
  const { theme, resolvedTheme } = useTheme()

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
        logoHref="/home"
        navigationLinks={[
          { href: '/fitspo-app', label: 'App' },
          { href: '/home#platform', label: 'Platform' },
        ]}
        signInText="Sign In"
        signInHref="/home"
        ctaText="Get Started"
        ctaHref="/home"
        onSignInClick={() => router.push('/home')}
        onCtaClick={() => router.push('/home')}
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
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Terms of Service</h1>
      <div className="mt-6 space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By accessing and using the Weight Lifting Calculator application ("the App"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">2. Use License</h2>
          <p className="text-muted-foreground mb-3">
            Permission is granted to temporarily access the materials (information or software) on the Weight Lifting Calculator app for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
            <li>modify or copy the materials</li>
            <li>use the materials for any commercial purpose or for any public display (commercial or non-commercial)</li>
            <li>attempt to decompile or reverse engineer any software contained on the App</li>
            <li>remove any copyright or other proprietary notations from the materials</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">3. User Account</h2>
          <p className="text-muted-foreground">
            When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password and for all activities that occur under your account. You agree not to disclose your password to any third party.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">4. Privacy</h2>
          <p className="text-muted-foreground">
            Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the App, to understand our practices.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">5. Content</h2>
          <p className="text-muted-foreground">
            Our App allows you to post, link, store, share and otherwise make available certain information, text, graphics, or other material ("Content"). You are responsible for the Content that you post to the App, including its legality, reliability, and appropriateness.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">6. Prohibited Uses</h2>
          <p className="text-muted-foreground mb-3">
            You may not use our App:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
            <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
            <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
            <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
            <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
            <li>To submit false or misleading information</li>
            <li>To upload or transmit viruses or any other type of malicious code</li>
            <li>To spam, phish, pharm, pretext, spider, crawl, or scrape</li>
            <li>For any obscene or immoral purpose</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">7. Accuracy of Materials</h2>
          <p className="text-muted-foreground">
            The materials appearing on the App could include technical, typographical, or photographic errors. We do not warrant that any of the materials on its App are accurate, complete, or current. We may make changes to the materials contained on its App at any time without notice.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">8. Limitations</h2>
          <p className="text-muted-foreground">
            In no event shall the Weight Lifting Calculator or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the App, even if we or our authorized representative has been notified orally or in writing of the possibility of such damage.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">9. Revisions</h2>
          <p className="text-muted-foreground">
            The materials appearing on the App may include technical, typographical, or photographic errors. We do not warrant that any of the materials on its App are accurate, complete, or current. We may make changes to the materials contained on its App at any time without notice.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">10. Governing Law</h2>
          <p className="text-muted-foreground">
            These terms and conditions are governed by and construed in accordance with the laws of your jurisdiction, and you irrevocably submit to the exclusive jurisdiction of the courts in that state or location.
          </p>
        </div>

        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
    </div>
  )
}



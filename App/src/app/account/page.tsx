"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

import { supabase } from "@/lib/supabaseClient"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

 
import { PricingPlansClient } from "@/components/pricing-plans-client"
import { ThemeSelectionCard } from "@/components/theme-selection-card"
 
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar"
import { plans } from "@/lib/plans"
import { toast } from "sonner"

type SupabaseIdentity = { identity_id: string; provider: string; last_sign_in_at: string | null }

export default function AccountPage() {

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [identities, setIdentities] = useState<SupabaseIdentity[]>([])

  const [pendingEmail, setPendingEmail] = useState("")
  const [password, setPassword] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [activeTab, setActiveTab] = useState("account")
  const [currentPlan, setCurrentPlan] = useState<string>('Free')
  const searchParams = useSearchParams()

  // Google Calendar integration
  const {
    isAuthenticated: isGoogleCalendarConnected,
    isLoading: isGoogleCalendarLoading,
    error: googleCalendarError,
    events: googleCalendarEvents,
    accounts: googleCalendarAccounts,
    removeAccount: removeGoogleCalendarAccount,
    logout: disconnectGoogleCalendar,
    fetchEvents,
    getAuthUrl,
    handleAuthCallback
  } = useGoogleCalendar({ autoSync: true })

  const canChangePassword = useMemo(() => identities.some(i => i.provider === "email"), [identities])
  
  const hasPaidPlan = useMemo(() => {
    return currentPlan === 'Personal' || currentPlan === 'Trainer'
  }, [currentPlan])

  useEffect(() => {
    const initialTab = searchParams.get('tab')
    if (initialTab === 'account' || initialTab === 'calendar' || initialTab === 'billing' || initialTab === 'data') {
      setActiveTab(initialTab)
    }
  }, [searchParams])

  // Refresh Google Calendar state when account page loads
  useEffect(() => {
    if (isGoogleCalendarConnected) {
      fetchEvents()
    }
  }, [isGoogleCalendarConnected, fetchEvents])

  // Handle OAuth callback from sessionStorage (no modal)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const code = sessionStorage.getItem('googleCalendarCode')
    const rawState = sessionStorage.getItem('googleCalendarState') || undefined
    if (!code) return
    // Clear stored values immediately to avoid loops
    sessionStorage.removeItem('googleCalendarCode')
    sessionStorage.removeItem('googleCalendarState')
    // Complete auth then refresh events
    // Optional nonce validation
    let state: string | undefined = rawState
    try {
      if (rawState && rawState.startsWith('%7B')) {
        const parsed = JSON.parse(decodeURIComponent(rawState)) as { next?: string; nonce?: string }
        const expected = sessionStorage.getItem('googleCalendarNonce')
        if (parsed?.nonce && expected && parsed.nonce !== expected) {
          toast.error('Security check failed. Please try connecting again.')
          return
        }
        state = rawState
      }
    } catch {}
    handleAuthCallback(code, state)
      .then(() => setTimeout(() => { void fetchEvents() }, 300))
      .catch(() => { /* error surfaced via hook state */ })
  }, [handleAuthCallback, fetchEvents])

  useEffect(() => {
    let unsub: (() => void) | null = null
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      const sessionUser = data.session?.user ?? null
      if (!sessionUser) {
        setLoading(false)
        return
      }
      setUserId(sessionUser.id)
      setEmail(sessionUser.email ?? "")
      setPendingEmail(sessionUser.email ?? "")
      setFullName(
        (sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || "") as string
      )
      setCreatedAt(sessionUser.created_at ?? null)
      setIdentities((sessionUser.identities || []) as SupabaseIdentity[])
      const planFromMeta = (sessionUser.user_metadata?.plan as string | undefined) || null
      const planFromStorage = typeof window !== 'undefined'
        ? ((localStorage.getItem('fitspo:plan') as string | null) || (localStorage.getItem('stronk:plan') as string | null))
        : null
      setCurrentPlan(planFromMeta || planFromStorage || 'Free')
      setLoading(false)

      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        const u = s?.user
        if (!u) return
        setUserId(u.id)
        setEmail(u.email ?? "")
        setPendingEmail(u.email ?? "")
        setFullName((u.user_metadata?.full_name || u.user_metadata?.name || "") as string)
        setCreatedAt(u.created_at ?? null)
        setIdentities((u.identities || []) as SupabaseIdentity[])
        const uPlan = (u.user_metadata?.plan as string | undefined) || null
        const lsPlan = typeof window !== 'undefined'
          ? ((localStorage.getItem('fitspo:plan') as string | null) || (localStorage.getItem('stronk:plan') as string | null))
          : null
        setCurrentPlan(uPlan || lsPlan || 'Free')
      })
      unsub = () => sub.subscription.unsubscribe()
    }
    void init()
    return () => { if (unsub) unsub() }
  }, [])

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } })
      if (error) throw error
      toast.success("Profile updated")
    } catch {
      toast.error("Failed to save profile")
    } finally {
      setSavingProfile(false)
    }
  }

  const handleUpdateEmail = async () => {
    if (!pendingEmail || pendingEmail === email) return
    setSavingEmail(true)
    try {
      // Ensure confirmation email redirects back to our app callback, then back to Account tab
      const base = ((process.env.NEXT_PUBLIC_BASE_URL as string) || '/').replace(/\/?$/, '/')
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}${base}auth/callback?next=${encodeURIComponent(`${base}account?tab=account`)}`
        : undefined

      const { error } = await supabase.auth.updateUser(
        { email: pendingEmail },
        redirectTo ? { emailRedirectTo: redirectTo } : undefined
      )
      if (error) throw error
      toast.success("Email update requested. Check your inbox to confirm.")
    } catch {
      toast.error("Failed to update email")
    } finally {
      setSavingEmail(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!canChangePassword || !password) return
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setPassword("")
      toast.success("Password updated")
    } catch {
      toast.error("Failed to update password")
    } finally {
      setSavingPassword(false)
    }
  }

  const exportData = () => {
    toast("Preparing download…")
    const collected: Record<string, unknown> = {
      profile: { id: userId, email, fullName, createdAt },
      local: {
        theme: typeof window !== "undefined" ? localStorage.getItem("theme") : null,
      },
    }
    try {
      if (typeof window !== "undefined") {
        const extraKeys = Object.keys(localStorage).filter(k => k.startsWith("fitspo:") || k.startsWith("stronk:"))
        const extras: Record<string, string | null> = {}
        for (const k of extraKeys) extras[k] = localStorage.getItem(k)
        collected["localKeys"] = extras
      }
    } catch (err) {
      // Intentionally ignore export failures (e.g., storage access blocked)
      void err
    }

    const blob = new Blob([JSON.stringify(collected, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "fitspo-account-export.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearSavedData = () => {
    const confirmed = typeof window !== "undefined" ? window.confirm("Delete saved settings on this device? This cannot be undone.") : false
    if (!confirmed) {
      toast.message("Deletion cancelled")
      return
    }
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("theme")
        Object.keys(localStorage)
          .filter(k => k.startsWith("fitspo:") || k.startsWith("stronk:"))
          .forEach(k => localStorage.removeItem(k))
        toast.success("Saved data deleted")
      }
    } catch (err) {
      // Intentionally ignore localStorage clear failures
      void err
      toast.error("Failed to delete saved data")
    }
  }

  

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" disabled>
            ← Back
          </Button>
          <div>
            <div className="h-8 w-32 mb-2 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="h-6 w-24 mb-2 bg-muted animate-pulse rounded" />
              <div className="h-4 w-48 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-10 w-full bg-muted animate-pulse rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-10 w-full bg-muted animate-pulse rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!userId) {
    if (typeof window !== 'undefined') {
      // Respect basePath in production (GitHub Pages) by using NEXT_PUBLIC_BASE_URL
      const base = ((process.env.NEXT_PUBLIC_BASE_URL as string) || '/').replace(/\/?$/, '/')
      window.location.replace(`${base}ideal-exercise-weight`)
    }
    return null
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" asChild>
          <Link href="/">← Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
          <p className="text-sm text-muted-foreground">Manage your profile, billing, and data.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="calendar">Calendar Sync</TabsTrigger>
          <TabsTrigger value="billing">Pricing & Billing</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your name and basic information.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Account created</Label>
                <Input value={createdAt ? new Date(createdAt).toLocaleString() : "—"} readOnly />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save profile"}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sign-in & Security</CardTitle>
              <CardDescription>Update your email and password.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={pendingEmail} onChange={e => setPendingEmail(e.target.value)} />
                </div>
                <Button variant="default" onClick={handleUpdateEmail} disabled={savingEmail || pendingEmail === email}>
                  {savingEmail ? "Updating…" : "Update email"}
                </Button>
                <p className="text-xs text-muted-foreground">Updating your email may require confirmation.</p>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">New password</Label>
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={canChangePassword ? "Enter a new password" : "Not available for social login"} disabled={!canChangePassword} />
                </div>
                <Button variant="default" onClick={handleUpdatePassword} disabled={!canChangePassword || savingPassword || !password}>
                  {savingPassword ? "Updating…" : "Update password"}
                </Button>
                {!canChangePassword && (
                  <p className="text-xs text-muted-foreground">Password changes are only available for email/password accounts.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <ThemeSelectionCard />

          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Manage your plan and billing.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => setActiveTab("billing")}>Manage subscription</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calendar Integration</CardTitle>
              <CardDescription>Connect your Google Calendar to sync workout sessions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isGoogleCalendarConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm">
                    {isGoogleCalendarConnected ? 'Google Calendar connected' : 'Not connected'}
                  </span>
                </div>
                {isGoogleCalendarConnected && (
                  <Badge variant="secondary" className="text-green-700 bg-green-100">
                    {googleCalendarEvents.length} events
                  </Badge>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => setActiveTab("calendar")} variant="outline">
                {isGoogleCalendarConnected ? 'Manage Calendar' : 'Connect Calendar'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Calendar Integration</CardTitle>
              <CardDescription>
                Connect your Google Calendar to sync workout sessions and view all your events in one place.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connection Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isGoogleCalendarConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div>
                    <div className="font-medium">
                      {isGoogleCalendarConnected ? `${googleCalendarAccounts.length} Google Calendar(s) Connected` : 'Not connected'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {isGoogleCalendarConnected 
                        ? `${googleCalendarEvents.length} events synced across ${googleCalendarAccounts.length} account(s)`
                        : 'Connect to sync your workout sessions with Google Calendar'
                      }
                    </div>
                  </div>
                </div>
                {isGoogleCalendarConnected && (
                  <Badge variant="secondary" className="text-green-700 bg-green-100">
                    {googleCalendarAccounts.length} Connected
                  </Badge>
                )}
              </div>

              {/* Connected Accounts List */}
              {googleCalendarAccounts.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Connected Accounts:</h4>
                  {googleCalendarAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: account.color }}
                        />
                        <div>
                          <div className="font-medium">{account.name}</div>
                          <div className="text-sm text-muted-foreground">{account.email}</div>
                          <div className="text-xs text-muted-foreground">
                            Connected {new Date(account.connectedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeGoogleCalendarAccount(account.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Error Display */}
              {googleCalendarError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm text-red-700">
                    <strong>Error:</strong> {googleCalendarError}
                  </div>
                </div>
              )}

              {/* Connection Actions */}
              <div className="flex gap-3">
                {!isGoogleCalendarConnected ? (
                  <Button 
                    onClick={() => {
                      const accountUrl = '/account?tab=calendar'
                      const authUrl = getAuthUrl(accountUrl)
                      if (typeof window !== 'undefined') window.location.href = authUrl
                    }}
                    disabled={isGoogleCalendarLoading}
                    className="flex-1"
                  >
                    {isGoogleCalendarLoading ? 'Connecting...' : 'Connect Google Calendar'}
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={() => {
                        const accountUrl = '/account?tab=calendar'
                        const authUrl = getAuthUrl(accountUrl)
                        if (typeof window !== 'undefined') window.location.href = authUrl
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Manage Connection
                    </Button>
                    <Button 
                      onClick={disconnectGoogleCalendar}
                      variant="outline"
                      className="flex-1"
                    >
                      Disconnect
                    </Button>
                  </>
                )}
              </div>

              {/* Benefits */}
              <div className="mt-6 space-y-3">
                <h4 className="font-medium">Benefits of connecting:</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Workout sessions automatically sync to your Google Calendar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>View all your calendar events in one unified view</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Google Calendar events appear in grey for easy distinction</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Real-time synchronization between platforms</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Security</CardTitle>
              <CardDescription>How we handle your calendar data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Data Access:</strong> We only request access to view and edit your calendar events. 
                  We cannot access your emails, contacts, or other Google data.
                </p>
                <p>
                  <strong>Data Storage:</strong> Your calendar data is not stored on our servers. 
                  We only sync events in real-time and store authentication tokens locally.
                </p>
                <p>
                  <strong>Revoke Access:</strong> You can disconnect your Google Calendar at any time 
                  using the disconnect button above, or revoke access directly in your Google Account settings.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card id="plans">
            <CardHeader>
              <CardTitle>Plans</CardTitle>
              <CardDescription>
                Manage your subscription. Current plan: {currentPlan}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PricingPlansClient plans={plans} />
            </CardContent>
            <CardFooter className="flex gap-3">
              <Button 
                disabled={!hasPaidPlan}
                onClick={async () => {
                  if (!hasPaidPlan) return
                  try {
                    const { data } = await supabase.auth.getSession()
                    const accessToken = data.session?.access_token
                    if (!accessToken) {
                      toast.error('Sign in required')
                      return
                    }
                    const res = await fetch('/api/stripe/portal', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${accessToken}` },
                    })
                    const body = await res.json()
                    if (!res.ok || !body?.url) {
                      toast.error('Unable to open billing portal')
                      return
                    }
                    if (typeof window !== 'undefined') window.location.href = body.url as string
                  } catch {
                    toast.error('Unable to open billing portal')
                  }
                }}
              >
                {hasPaidPlan ? 'Manage subscription' : 'Manage subscription (Free plan)'}
              </Button>
              <Button variant="secondary" onClick={async () => {
                const { data } = await supabase.auth.getSession()
                const uPlan = (data.session?.user?.user_metadata?.plan as string | undefined) || null
                const lsPlan = typeof window !== 'undefined'
                  ? ((localStorage.getItem('fitspo:plan') as string | null) || (localStorage.getItem('stronk:plan') as string | null))
                  : null
                setCurrentPlan(uPlan || lsPlan || 'Free')
              }}>Refresh status</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export</CardTitle>
              <CardDescription>Download a copy of your data.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={exportData}>Export data</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved settings</CardTitle>
              <CardDescription>Remove saved settings from this device.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="destructive" onClick={clearSavedData}>Delete saved data</Button>
            </CardFooter>
          </Card>

          <Separator />

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
              <CardDescription>Delete your account from this platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Account deletion requires a secure server-side process. If this project adds a deletion endpoint later,
                it will appear here. For now, contact support or remove your saved data above.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" disabled>Delete account (unavailable)</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      
    </div>
  )
}



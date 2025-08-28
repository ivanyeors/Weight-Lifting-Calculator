"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function AuthCallbackPage() {
  const [mode, setMode] = useState<"loading" | "recovery">("loading")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const nextUrl = useMemo(() => {
    try {
      const url = new URL(window.location.href)
      return url.searchParams.get("next")
    } catch {
      return null
    }
  }, [])

  const exchange = useCallback(async () => {
    try {
      const { data } = await supabase.auth.exchangeCodeForSession(window.location.href)
      // If this is a password recovery flow, Supabase marks the session as a recovery
      const type = (data?.session?.user?.app_metadata as unknown as { provider?: string }) || null
      // Supabase v2 doesn't expose type directly here; rely on presence of "type=recovery" in URL
      const isRecovery = /[?&]type=recovery(&|$)/.test(window.location.search)
      if (isRecovery) {
        setMode("recovery")
        return
      }
    } catch (err) {
      // If exchange fails but this is recovery, still allow password set
      const isRecovery = /[?&]type=recovery(&|$)/.test(window.location.search)
      if (isRecovery) {
        setMode("recovery")
        return
      }
      // Non-recovery failure → fall through to redirect
      void err
    }
    // Normal sign-in / email confirm → redirect
    const base = ((process.env.NEXT_PUBLIC_BASE_URL as string) || "/").replace(/\/?$/, "/")
    const fallback = base
    const to = nextUrl || sessionStorage.getItem("postAuthRedirectTo") || fallback
    sessionStorage.removeItem("postAuthRedirectTo")
    if (typeof window !== "undefined") window.location.replace(to)
  }, [nextUrl])

  useEffect(() => {
    void exchange()
  }, [exchange])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    setSubmitting(true)
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
      if (updateErr) throw updateErr
      setMessage("Password updated. Redirecting…")
      const base = ((process.env.NEXT_PUBLIC_BASE_URL as string) || "/").replace(/\/?$/, "/")
      const to = nextUrl || `${base}account?tab=account`
      setTimeout(() => {
        if (typeof window !== "undefined") window.location.replace(to)
      }, 600)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || "Failed to update password")
    } finally {
      setSubmitting(false)
    }
  }

  if (mode === "recovery") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <form onSubmit={handleSetPassword} className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <p className="text-lg font-medium">Set a new password</p>
            <p className="text-sm text-muted-foreground mt-1">Enter a new password to complete recovery.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new">New password</Label>
            <Input id="new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {message && <div className="text-sm text-green-600">{message}</div>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">
        <p className="text-lg font-medium">Signing you in…</p>
        <p className="text-sm text-muted-foreground mt-1">Please wait while we complete authentication.</p>
      </div>
    </div>
  )
}



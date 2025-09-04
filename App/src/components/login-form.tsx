import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabaseClient"

export function LoginForm({
  className,
  onSuccess,
  ...props
}: React.ComponentProps<"div"> & { onSuccess?: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (mode !== 'reset' && (!email || !password)) {
      setError("Email and password are required.")
      return
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    setLoading(true)
    try {
      if (mode === 'reset') {
        const base = ((process.env.NEXT_PUBLIC_BASE_URL as string) || '/').replace(/\/?$/, '/');
        const redirectTo = `${window.location.origin}${base}auth/callback`;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        })
        if (resetError) throw resetError
        setMessage("Password reset email sent.")
      } else if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        setMessage("Signed in successfully.")
        // Notify parent to close the sheet immediately
        onSuccess?.()
      } else {
        const base = ((process.env.NEXT_PUBLIC_BASE_URL as string) || '/').replace(/\/?$/, '/');
        const redirectTo = `${window.location.origin}${base}auth/callback`;
        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
          },
        })
        if (signUpError) throw signUpError
        // If email confirmation is required, there won't be a session yet
        if (!data.session) {
          setMessage("Check your email to confirm your account.")
        } else {
          setMessage("Account created and signed in.")
          // If signup returns a session (rare with email confirmation enabled), also close
          onSuccess?.()
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message || "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  // removed separate handlePasswordReset; handled via form submit in reset mode

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              {mode === 'reset' && (
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
                  className="self-start text-sm underline-offset-2 hover:underline cursor-pointer"
                >
                  ← Back
                </button>
              )}
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">{mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'}</h1>
                <p className="text-muted-foreground text-balance">
                  {mode === 'signin' ? 'Sign in to continue' : mode === 'signup' ? 'Sign up with your email and password' : 'Enter your email to receive a reset link'}
                </p>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {mode !== 'reset' && (
                <div className="grid gap-3">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => { setMode('reset'); setError(null); setMessage(null); }}
                        className="ml-auto text-sm underline-offset-2 hover:underline"
                      >
                        Forgot your password?
                      </button>
                    )}
                  </div>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              )}
              {mode === 'signup' && (
                <div className="grid gap-3">
                  <Label htmlFor="confirm">Confirm Password</Label>
                  <Input id="confirm" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
              )}
              {error && (
                <div className="text-sm text-red-600">{error}</div>
              )}
              {message && (
                <div className="text-sm text-green-600">{message}</div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? (mode === 'signin' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Sending reset email...')
                  : (mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset Password')}
              </Button>
              {mode !== 'reset' && (
                <>
                  <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                    <span className="bg-card text-muted-foreground relative z-10 px-2">
                      Or continue with
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <Button
                      variant="outline"
                      type="button"
                      className="w-full"
                      onClick={async () => {
                        sessionStorage.setItem('postAuthRedirectTo', window.location.pathname + window.location.search)
                        const base = ((process.env.NEXT_PUBLIC_BASE_URL as string) || '/').replace(/\/?$/, '/');
                        await supabase.auth.signInWithOAuth({
                          provider: 'google',
                          options: { redirectTo: `${window.location.origin}${base}auth/callback` },
                        })
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path
                          d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                          fill="currentColor"
                        />
                      </svg>
                      <span className="sr-only">Login with Google</span>
                    </Button>
                  </div>
                </>
              )}
              <div className="text-center text-sm">
                {mode === 'signin' ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      className="underline underline-offset-4 cursor-pointer"
                      onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
                    >
                      Sign up
                    </button>
                  </>
                ) : mode === 'signup' ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="underline underline-offset-4 cursor-pointer"
                      onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    Remembered your password?{" "}
                    <button
                      type="button"
                      className="underline underline-offset-4 cursor-pointer"
                      onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
                    >
                      Back to sign in
                    </button>
                  </>
                )}
              </div>
            </div>
          </form>
          <div
            className="relative hidden md:flex items-center justify-center p-8"
            style={{
              background: 'radial-gradient(circle at center, #283DFF 0%, #060612 100%)'
            }}
          >
            <img
              src="/logo-dark.svg"
              alt="Logo"
              className="w-32 h-32 object-contain"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  )
}

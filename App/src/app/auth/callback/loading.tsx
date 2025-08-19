import { Loading } from "@/components/ui/loading"

export default function AuthCallbackLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="space-y-4 text-center">
        <Loading size="lg" text="Completing sign in..." />
        <p className="text-sm text-muted-foreground">Please wait while we redirect you...</p>
      </div>
    </div>
  )
}

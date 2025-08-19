import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"

interface LoadingProps {
  className?: string
  size?: "sm" | "md" | "lg"
  text?: string
  showSkeleton?: boolean
  skeletonLines?: number
}

export function Loading({ 
  className, 
  size = "md", 
  text = "Loading...",
  showSkeleton = false,
  skeletonLines = 3
}: LoadingProps) {
  if (showSkeleton) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: skeletonLines }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              "h-4",
              i === 0 ? "w-3/4" : i === 1 ? "w-1/2" : "w-2/3"
            )} 
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex items-center space-x-2">
        <div className={cn(
          "animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground",
          {
            "h-4 w-4": size === "sm",
            "h-6 w-6": size === "md", 
            "h-8 w-8": size === "lg"
          }
        )} />
        {text && (
          <span className="text-sm text-muted-foreground">{text}</span>
        )}
      </div>
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="space-y-4 text-center">
        <Loading size="lg" />
        <p className="text-sm text-muted-foreground">Loading page...</p>
      </div>
    </div>
  )
}

export function CardLoading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <Skeleton className="h-12 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        
        <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="relative">
              <CardHeader className="text-center">
                <Skeleton className="h-8 w-32 mx-auto mb-2" />
                <Skeleton className="h-6 w-24 mx-auto mb-4" />
                <Skeleton className="h-12 w-20 mx-auto" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-10 w-full mt-6" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

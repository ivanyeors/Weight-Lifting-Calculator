"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { Dumbbell, ChefHat, Target, CalendarDays } from 'lucide-react'
import { InteractiveGridPattern } from '@/components/ui/shadcn-io/interactive-grid-pattern'

export default function HomeHub() {
  const router = useRouter()
  const [gridSquares] = useState<[number, number]>([12, 12])
  const [cellSize, setCellSize] = useState<{ w: number; h: number }>({ w: 40, h: 40 })

  useEffect(() => {
    const recalc = () => {
      const [cols, rows] = gridSquares
      const w = Math.ceil((window.innerWidth || 0) / cols)
      const h = Math.ceil((window.innerHeight || 0) / rows)
      setCellSize({ w, h })
    }
    recalc()
    window.addEventListener('resize', recalc)
    return () => window.removeEventListener('resize', recalc)
  }, [gridSquares])

  const features = [
    {
      id: 'exercise',
      title: 'Exercise',
      description: 'Browse exercises and build smart templates for your training.',
      icon: <Dumbbell className="h-5 w-5 text-primary" />,
      href: '/exercise-library',
      action: 'Open Library'
    },
    {
      id: 'nutrition',
      title: 'Nutrition',
      description: 'Plan meals and save recipes aligned with your goals.',
      icon: <ChefHat className="h-5 w-5 text-primary" />,
      href: '/plans/nutrition',
      action: 'Open Nutrition'
    },
    {
      id: 'goal',
      title: 'Goal',
      description: 'Define and track your fitness goals over time.',
      icon: <Target className="h-5 w-5 text-primary" />,
      href: '/fitness-goal',
      action: 'Open Goals'
    },
    {
      id: 'calendar',
      title: 'Calendar',
      description: 'Schedule and manage your workout sessions.',
      icon: <CalendarDays className="h-5 w-5 text-primary" />,
      href: '/plans/workout-plans',
      action: 'Open Calendar'
    }
  ] as const

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <InteractiveGridPattern
          width={cellSize.w}
          height={cellSize.h}
          squares={gridSquares}
          className="h-full w-full"
          squaresClassName="stroke-muted/40 hover:fill-[#0A19A3]/60 transition-colors duration-300"
        />
      </div>
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Welcome</h1>
          <p className="text-muted-foreground mt-2 text-sm">Choose a feature to get started</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto place-items-stretch">
          {features.map((f) => (
            <Card
              key={f.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(f.href)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  router.push(f.href)
                }
              }}
              className="group flex flex-col border transition-colors hover:bg-accent/30 hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <CardHeader className="space-y-2">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  {f.icon}
                </div>
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}



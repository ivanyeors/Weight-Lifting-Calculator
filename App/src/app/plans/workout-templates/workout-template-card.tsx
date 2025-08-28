"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Flame, Dumbbell, Target } from "lucide-react"

interface WorkoutTemplateCardProps {
  template: {
    id: string
    name: string
    exerciseCount: number
    estimatedCalories: number
    estimatedTime: number
    usageCount: number
    workoutSpace?: string
  }
  onClick: () => void
}

export function WorkoutTemplateCard({ template, onClick }: WorkoutTemplateCardProps) {
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50 group"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
          {template.name}
        </CardTitle>
        {template.workoutSpace && (
          <Badge variant="secondary" className="w-fit">
            {template.workoutSpace}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Dumbbell className="h-4 w-4" />
            <span>{template.exerciseCount} exercises</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Flame className="h-4 w-4" />
            <span>~{template.estimatedCalories} cal</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatTime(template.estimatedTime)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>Used {template.usageCount}x</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useMemo, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Activity, ChevronDown, Search } from "lucide-react"

type Exercise = {
  id: string
  name: string
  description: string
  baseWeightFactor: number
}

export function ExerciseDropdown({
  exercises,
  selectedExerciseId,
  onSelectExercise,
  isLoading = false,
  error = null,
  className,
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
  alignOffset = 0,
  contentClassName,
}: {
  exercises: Exercise[]
  selectedExerciseId: string
  onSelectExercise: (id: string) => void
  isLoading?: boolean
  error?: string | null
  className?: string
  align?: 'start' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right'
  sideOffset?: number
  alignOffset?: number
  contentClassName?: string
}) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return exercises
    return exercises.filter(ex => ex.name.toLowerCase().includes(q))
  }, [exercises, searchQuery])

  const currentExerciseName = useMemo(() => {
    return exercises.find(ex => ex.id === selectedExerciseId)?.name || "Select Exercise"
  }, [exercises, selectedExerciseId])

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between h-10 bg-background border-border hover:bg-accent hover:text-accent-foreground transition-colors min-w-[220px]"
            disabled={isLoading}
          >
            <span className="truncate font-medium">
              {isLoading ? "Loading exercises..." : currentExerciseName}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50 transition-transform" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className={[
            "w-[--radix-dropdown-menu-trigger-width] min-w-[280px] max-h-[350px] overflow-y-auto",
            contentClassName || ''
          ].join(' ')}
          align={align}
          side={side}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
        >
          <DropdownMenuLabel className="flex items-center">
            <Activity className="mr-2 h-4 w-4" />
            Select Exercise
          </DropdownMenuLabel>
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-background border-border hover:border-border/80 focus:border-primary transition-colors"
              />
            </div>
          </div>
          <DropdownMenuSeparator />
          {filteredExercises.length > 0 ? (
            filteredExercises.map((exercise) => (
              <DropdownMenuItem
                key={exercise.id}
                onClick={() => onSelectExercise(exercise.id)}
                className="cursor-pointer py-3 hover:bg-accent/50"
              >
                <div className="flex flex-col w-full">
                  <span className="font-medium text-sm">{exercise.name}</span>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground">
                      Weight Factor
                    </span>
                    <span className="text-xs font-semibold text-primary tabular-nums">
                      {exercise.baseWeightFactor}
                    </span>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled className="text-center py-4">
              <div className="flex flex-col items-center">
                <span className="text-sm text-muted-foreground">
                  {searchQuery ? "No exercises found" : "No exercises available"}
                </span>
                {searchQuery && (
                  <span className="text-xs text-muted-foreground mt-1">
                    Try adjusting your search
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          )}
          {error && (
            <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 p-3 rounded-lg m-3 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start space-x-2">
                <span className="text-amber-600 dark:text-amber-400">⚠</span>
                <span>{error}</span>
              </div>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}



"use client"

import { useMemo, useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Search } from "lucide-react"
import { loadAllExerciseData, type ExternalExercise } from '@/lib/exerciseLoader'
import Link from 'next/link'

// Use the shared ExternalExercise type from the loader

export function ExerciseDropdown({
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
  const [exercises, setExercises] = useState<ExternalExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Load exercise data using shared loader (handles basePath/manifest)
  useEffect(() => {
    const loadExercises = async () => {
      try {
        setLoading(true)
        setLoadError(null)
        const data = await loadAllExerciseData()
        setExercises(data)
      } catch (err) {
        console.error('Error loading exercises:', err)
        setLoadError('Failed to load exercises. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    loadExercises()
  }, [])

  const filteredExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return exercises

    // Lightweight fuzzy scoring: characters must appear in order, with
    // bonuses for word-starts and consecutive matches
    const WORD_BREAK_REGEX = /[\s\-_/\\.]/
    const fuzzyScore = (query: string, target: string): number | null => {
      let totalScore = 0
      let targetIndex = 0
      let lastMatchIndex = -1

      for (let i = 0; i < query.length; i++) {
        const qChar = query[i]
        let found = false

        while (targetIndex < target.length) {
          const tChar = target[targetIndex]
          if (tChar === qChar) {
            found = true
            let bonus = 1 // base match
            if (targetIndex === 0) bonus += 2 // starts at beginning
            const prevChar = target[targetIndex - 1]
            if (prevChar && WORD_BREAK_REGEX.test(prevChar)) bonus += 1 // after break
            if (lastMatchIndex + 1 === targetIndex) bonus += 1 // consecutive

            totalScore += bonus
            lastMatchIndex = targetIndex
            targetIndex++
            break
          }
          targetIndex++
        }

        if (!found) return null
      }

      // Tiny length penalty to prefer tighter matches
      return totalScore - Math.max(0, target.length - query.length) * 0.01
    }

    return exercises
      .map((ex) => {
        const score = fuzzyScore(q, ex.name.toLowerCase())
        return score == null ? null : { ex, score }
      })
      .filter((v): v is { ex: ExternalExercise; score: number } => v !== null)
      .sort((a, b) => b.score - a.score)
      .map((v) => v.ex)
  }, [exercises, searchQuery])

  const currentExerciseName = useMemo(() => {
    return exercises.find(ex => ex.id === selectedExerciseId)?.name || "Select Exercise"
  }, [exercises, selectedExerciseId])

  // Use the loading state from data loading or the prop
  const isActuallyLoading = loading || isLoading
  const displayError = loadError || error

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between h-10 bg-background border-border hover:bg-accent hover:text-accent-foreground transition-colors min-w-[220px]"
            disabled={isActuallyLoading}
          >
            <span className="truncate font-medium">
              {isActuallyLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 animate-spin rounded-full border border-muted-foreground/20 border-t-foreground" />
                  <span>Loading exercises...</span>
                </div>
              ) : (
                currentExerciseName
              )}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50 transition-transform" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className={[
            "w-[--radix-dropdown-menu-trigger-width] max-h-[350px] overflow-y-auto",
            contentClassName || ''
          ].join(' ')}
          align={align}
          side={side}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
        >
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="exercise-search"
                name="exercise-search"
                aria-label="Search exercises"
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                autoFocus
                className="pl-10 h-10 bg-background border-border hover:border-border/80 focus:border-primary transition-colors"
              />
            </div>
          </div>
          <DropdownMenuSeparator />
          {filteredExercises.length > 0 ? (
            <DropdownMenuRadioGroup value={selectedExerciseId} onValueChange={onSelectExercise}>
              {filteredExercises.map((exercise) => (
                <DropdownMenuRadioItem
                  key={exercise.id}
                  value={exercise.id}
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
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
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
          {displayError && (
            <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 p-3 rounded-lg m-3 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start space-x-2">
                <span className="text-amber-600 dark:text-amber-400">⚠</span>
                <span>{displayError}</span>
              </div>
            </div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer py-3">
            <Link href="/exercise-library" className="w-full">
              View all exercises
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}



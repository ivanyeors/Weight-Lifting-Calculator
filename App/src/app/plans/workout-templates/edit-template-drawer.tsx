"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Dumbbell, Target, Clock, Lock } from "lucide-react"
import { supabase } from '@/lib/supabaseClient'
import { loadAllExerciseData } from '@/lib/exerciseLoader'
import { useSelectedUser } from '@/hooks/use-selected-user'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"

interface Exercise {
  id: string
  name: string
  description: string
  muscleGroups?: string[]
  baseWeightFactor?: number
}

interface ExerciseConfig {
  exerciseId: string
  sets: number
  reps: number
  restTime?: number
}

interface WorkoutTemplate {
  id: string
  name: string
  workoutSpaceId: string
  workoutSpaceName: string
  exercises: ExerciseConfig[]
  estimatedCalories: number
  estimatedTime: number
  usageCount: number
  exerciseCount: number
}

interface EditTemplateDrawerProps {
  open: boolean
  template: WorkoutTemplate | null
  onOpenChange: (open: boolean) => void
  onSave: (template: WorkoutTemplate) => void
}

export function EditTemplateDrawer({ open, template, onOpenChange, onSave }: EditTemplateDrawerProps) {
  const { user: selectedUser } = useSelectedUser()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [exerciseConfigs, setExerciseConfigs] = useState<ExerciseConfig[]>([])
  const [personalWeights, setPersonalWeights] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  // Load exercises when drawer opens
  useEffect(() => {
    const loadExercises = async () => {
      try {
        // Use the exercise loader which handles Supabase + fallback logic
        const exerciseData = await loadAllExerciseData()
        
        const mapped: Exercise[] = exerciseData.map((ex) => ({
          id: ex.id,
          name: ex.name,
          description: ex.description,
          baseWeightFactor: ex.baseWeightFactor,
          muscleGroups: Object.keys(ex.muscleInvolvement).filter(muscle => ex.muscleInvolvement[muscle] > 0)
        }))
        
        setExercises(mapped)
      } catch (err) {
        console.error('Failed to load exercises', err)
      }
    }

    if (open && template) {
      loadExercises()
      setExerciseConfigs(template.exercises)
      loadPersonalWeights()
    }
  }, [open, template])

  // Load personal weight data for exercises based on current user
  const loadPersonalWeights = async () => {
    if (!selectedUser) {
      setPersonalWeights({})
      return
    }

    try {
      // In a real implementation, you'd fetch the user's calculated weights
              // from the exercise weights calculator or their personal exercise data
      // For now, we'll use mock data that would come from the user's profile
      const mockWeights: Record<string, number> = {
        'bench-press': 60,
        'squats': 80,
        'deadlift': 100,
        'shoulder-press': 40,
        'pull-ups': 0, // Bodyweight exercise
        'push-ups': 0, // Bodyweight exercise
        'sit-ups': 0, // Bodyweight exercise
        'lunges': 30,
        'leg-press': 120,
        'calf-raises': 50,
        'bicep-curls': 20,
        'tricep-dips': 0, // Bodyweight exercise
      }
      setPersonalWeights(mockWeights)
    } catch (err) {
      console.error('Failed to load personal weights', err)
    }
  }

  const updateExerciseConfig = (exerciseId: string, field: keyof ExerciseConfig, value: number) => {
    setExerciseConfigs(prev => 
      prev.map(config => 
        config.exerciseId === exerciseId 
          ? { ...config, [field]: value }
          : config
      )
    )
  }

  const removeExercise = (exerciseId: string) => {
    setExerciseConfigs(prev => prev.filter(config => config.exerciseId !== exerciseId))
  }

  const getExerciseName = (exerciseId: string) => {
    return exercises.find(ex => ex.id === exerciseId)?.name || exerciseId
  }

  const getExerciseDescription = (exerciseId: string) => {
    return exercises.find(ex => ex.id === exerciseId)?.description || ''
  }

  const calculateEstimatedTime = () => {
    // Rough estimate: 2 minutes per set + 1 minute rest between exercises
    const totalSets = exerciseConfigs.reduce((sum, config) => sum + config.sets, 0)
    const exerciseCount = exerciseConfigs.length
    return totalSets * 2 + exerciseCount
  }

  const calculateEstimatedCalories = () => {
    // Rough estimate: 5 calories per minute of exercise
    return Math.round(calculateEstimatedTime() * 5)
  }

  const handleSave = () => {
    if (!template) return
    
    const updatedTemplate: WorkoutTemplate = {
      ...template,
      exercises: exerciseConfigs,
      estimatedTime: calculateEstimatedTime(),
      estimatedCalories: calculateEstimatedCalories(),
      exerciseCount: exerciseConfigs.length
    }
    
    onSave(updatedTemplate)
    onOpenChange(false)
  }

  if (!template) return null

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="data-[vaul-drawer-direction=right]:!w-1/2 data-[vaul-drawer-direction=right]:!max-w-none">
        <div className="flex flex-col h-full">
          <DrawerHeader className="pb-0">
            <DrawerTitle>Edit Workout Template</DrawerTitle>
            <p className="text-sm text-muted-foreground mt-1">{template.name}</p>
          </DrawerHeader>

        <div className="px-6 space-y-6 flex-1 overflow-y-auto">
          {/* Template Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Dumbbell className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">{exerciseConfigs.length}</p>
                <p className="text-xs text-muted-foreground">Exercises</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Target className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">{calculateEstimatedCalories()}</p>
                <p className="text-xs text-muted-foreground">Est. Calories</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">{calculateEstimatedTime()}m</p>
                <p className="text-xs text-muted-foreground">Est. Time</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Exercise Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Exercise Configuration</h3>
            
            {exerciseConfigs.map((config, index) => {
              const exercise = exercises.find(ex => ex.id === config.exerciseId)
              return (
                <Card key={config.exerciseId} className="p-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{exercise?.name || config.exerciseId}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExercise(config.exerciseId)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                    {exercise?.description && (
                      <p className="text-sm text-muted-foreground">{exercise.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`sets-${index}`}>Sets</Label>
                        <Input
                          id={`sets-${index}`}
                          type="number"
                          min="1"
                          max="20"
                          value={config.sets}
                          onChange={(e) => updateExerciseConfig(config.exerciseId, 'sets', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`reps-${index}`}>Reps</Label>
                        <Input
                          id={`reps-${index}`}
                          type="number"
                          min="1"
                          max="100"
                          value={config.reps}
                          onChange={(e) => updateExerciseConfig(config.exerciseId, 'reps', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`weight-${index}`}>
                          Weight (kg)
                        </Label>
                        <div className="relative">
                          <Input
                            id={`weight-${index}`}
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder={personalWeights[config.exerciseId] !== undefined ? `${personalWeights[config.exerciseId]}kg` : "No weight data"}
                            value={personalWeights[config.exerciseId] !== undefined ? personalWeights[config.exerciseId] : ''}
                            disabled
                            className="bg-muted cursor-not-allowed"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`rest-${index}`}>Rest (min)</Label>
                        <Input
                          id={`rest-${index}`}
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="Optional"
                          value={config.restTime || ''}
                          onChange={(e) => updateExerciseConfig(config.exerciseId, 'restTime', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        <DrawerFooter>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

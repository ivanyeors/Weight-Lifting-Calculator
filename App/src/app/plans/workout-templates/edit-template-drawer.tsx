"use client"

import { useState, useEffect, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Dumbbell, Target, Clock, Lock, Plus, Search } from "lucide-react"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useIsMobile } from '@/hooks/use-mobile'

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
  const isMobile = useIsMobile()
  const { user: selectedUser } = useSelectedUser()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [exerciseConfigs, setExerciseConfigs] = useState<ExerciseConfig[]>([])
  const [personalWeights, setPersonalWeights] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false)
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("")
  const [pendingAddExerciseIds, setPendingAddExerciseIds] = useState<Set<string>>(new Set())
  const [allowedExerciseIds, setAllowedExerciseIds] = useState<Set<string>>(new Set())

  // Load exercises when drawer opens (prefer DB, fallback to loader)
  useEffect(() => {
    const loadExercises = async () => {
      try {
        // Try DB first
        const { data, error } = await supabase
          .from('exercises')
          .select('id, name, description, base_weight_factor')
          .order('name', { ascending: true })
        if (!error && data && data.length > 0) {
          const mapped: Exercise[] = data.map((row: any) => ({
            id: row.id as string,
            name: (row.name as string) ?? row.id,
            description: (row.description as string) ?? '',
            baseWeightFactor: Number(row.base_weight_factor ?? 1.0),
          }))
          setExercises(mapped)
          return
        }

        // Fallback to loader (merges JSONs)
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

  // Filter available exercises by selected workout space
  useEffect(() => {
    const loadAllowed = async () => {
      if (!open || !template) return
      if (!template.workoutSpaceId) { setAllowedExerciseIds(new Set()); return }
      try {
        const { data, error } = await supabase
          .from('available_exercises_for_space')
          .select('exercise_id')
          .eq('space_id', template.workoutSpaceId)
        if (error) throw error
        const ids = new Set<string>((data ?? []).map((r: any) => r.exercise_id as string))
        setAllowedExerciseIds(ids)
      } catch (err) {
        console.error('Failed to load allowed exercises for space', err)
        setAllowedExerciseIds(new Set(exercises.map(e => e.id)))
      }
    }
    loadAllowed()
  }, [open, template, exercises])

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

  const togglePendingExercise = (exerciseId: string) => {
    setPendingAddExerciseIds(prev => {
      const next = new Set(prev)
      if (next.has(exerciseId)) next.delete(exerciseId)
      else next.add(exerciseId)
      return next
    })
  }

  const handleConfirmAddExercises = () => {
    if (pendingAddExerciseIds.size === 0) return
    const existingIds = new Set(exerciseConfigs.map(c => c.exerciseId))
    const toAdd = Array.from(pendingAddExerciseIds).filter(id => !existingIds.has(id))
    if (toAdd.length === 0) {
      setIsAddExerciseOpen(false)
      setPendingAddExerciseIds(new Set())
      setExerciseSearchQuery("")
      return
    }

    const newConfigs: ExerciseConfig[] = toAdd.map(exerciseId => ({
      exerciseId,
      sets: 3,
      reps: 10,
      restTime: 0,
    }))

    setExerciseConfigs(prev => [...newConfigs, ...prev])
    setIsAddExerciseOpen(false)
    setPendingAddExerciseIds(new Set())
    setExerciseSearchQuery("")
  }

  const getExerciseName = (exerciseId: string) => {
    return exercises.find(ex => ex.id === exerciseId)?.name || exerciseId
  }

  const getExerciseDescription = (exerciseId: string) => {
    return exercises.find(ex => ex.id === exerciseId)?.description || ''
  }

  const availableExercises: Exercise[] = useMemo(() => {
    const configuredIds = new Set(exerciseConfigs.map(c => c.exerciseId))
    return exercises
      .filter(ex => allowedExerciseIds.has(ex.id))
      .filter(ex => !configuredIds.has(ex.id))
  }, [exercises, exerciseConfigs, allowedExerciseIds])

  const filteredAvailableExercises: Exercise[] = useMemo(() => {
    const query = exerciseSearchQuery.trim().toLowerCase()
    if (!query) return availableExercises
    return availableExercises.filter(ex =>
      ex.name.toLowerCase().includes(query) ||
      (ex.description ?? "").toLowerCase().includes(query)
    )
  }, [availableExercises, exerciseSearchQuery])

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
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? 'bottom' : 'right'}>
      <DrawerContent className="data-[vaul-drawer-direction=right]:!w-[80vw] data-[vaul-drawer-direction=right]:!max-w-none lg:data-[vaul-drawer-direction=right]:!w-1/2 data-[vaul-drawer-direction=bottom]:!max-h-[85vh]">
        <div className="flex flex-col h-full overflow-hidden">
          <DrawerHeader className="pb-0">
            <DrawerTitle>Edit Workout Template</DrawerTitle>
            <p className="text-sm text-muted-foreground mt-1">{template.name}</p>
          </DrawerHeader>

        <div className="px-3 md:px-6 space-y-4 md:space-y-6 flex-1 overflow-y-auto overscroll-contain min-h-0">
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
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Exercise Configuration</h3>
              <Popover open={isAddExerciseOpen} onOpenChange={(open) => {
                setIsAddExerciseOpen(open)
                if (!open) {
                  setPendingAddExerciseIds(new Set())
                  setExerciseSearchQuery("")
                }
              }}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="secondary">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Exercise
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-2">
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search exercises..."
                        value={exerciseSearchQuery}
                        onChange={(e) => setExerciseSearchQuery(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                    <div className="border rounded-md max-h-80 overflow-y-auto overscroll-contain" onWheelCapture={(e) => e.stopPropagation()}>
                      {filteredAvailableExercises.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">No exercises found</div>
                      ) : (
                        filteredAvailableExercises.map((ex) => {
                          const checked = pendingAddExerciseIds.has(ex.id)
                          return (
                            <div
                              key={ex.id}
                              role="button"
                              tabIndex={0}
                              className="flex items-start gap-3 px-3 py-2 hover:bg-muted transition-colors cursor-pointer"
                              onClick={() => togglePendingExercise(ex.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  togglePendingExercise(ex.id)
                                }
                              }}
                            >
                              <Checkbox checked={checked} onCheckedChange={() => togglePendingExercise(ex.id)} />
                              <div className="flex flex-col">
                                <span className="font-medium">{ex.name}</span>
                                {ex.description && (
                                  <span className="text-xs text-muted-foreground">{ex.description}</span>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => { setIsAddExerciseOpen(false); setPendingAddExerciseIds(new Set()); setExerciseSearchQuery("") }}>Cancel</Button>
                      <Button size="sm" onClick={handleConfirmAddExercises} disabled={pendingAddExerciseIds.size === 0}>
                        Add{pendingAddExerciseIds.size > 0 ? ` (${pendingAddExerciseIds.size})` : ''}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {exerciseConfigs.map((config, index) => {
              const exercise = exercises.find(ex => ex.id === config.exerciseId)
              return (
                <Card key={config.exerciseId} className="p-1">
                  <CardHeader className="px-1 pb-3">
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
                  <CardContent className="px-1 pt-0">
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

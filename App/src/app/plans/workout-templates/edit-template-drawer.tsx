"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Card } from '@/components/ui/card'
import { Plus, Trash2 } from "lucide-react"

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

interface Exercise {
  id: string
  name: string
  description: string
  muscleGroups?: string[]
}

export function EditTemplateDrawer({
  open,
  template,
  onOpenChange,
  onSave
}: EditTemplateDrawerProps) {
  const [templateName, setTemplateName] = useState('')
  const [selectedSpaceId, setSelectedSpaceId] = useState('gym')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [templateExercises, setTemplateExercises] = useState<ExerciseConfig[]>([])

  // Load exercises
  useEffect(() => {
    const loadExercises = async () => {
      try {
        // For now, we'll use mock data
        const mockExercises: Exercise[] = [
          { id: 'bench-press', name: 'Bench Press', description: 'Chest exercise', muscleGroups: ['Chest', 'Triceps'] },
          { id: 'squats', name: 'Squats', description: 'Leg exercise', muscleGroups: ['Legs', 'Glutes'] },
          { id: 'deadlift', name: 'Deadlift', description: 'Full body exercise', muscleGroups: ['Back', 'Legs'] },
          { id: 'pull-ups', name: 'Pull-ups', description: 'Back exercise', muscleGroups: ['Back', 'Biceps'] },
          { id: 'shoulder-press', name: 'Shoulder Press', description: 'Shoulder exercise', muscleGroups: ['Shoulders'] },
          { id: 'lunges', name: 'Lunges', description: 'Leg exercise', muscleGroups: ['Legs'] }
        ]
        setExercises(mockExercises)
      } catch (error) {
        console.error('Failed to load exercises:', error)
        toast.error('Failed to load exercises')
      }
    }

    if (open) {
      loadExercises()
    }
  }, [open])

  // Load template data when template changes
  useEffect(() => {
    if (template) {
      setTemplateName(template.name)
      setSelectedSpaceId(template.workoutSpaceId)
      setTemplateExercises(template.exercises)
    }
  }, [template])

  const handleSave = () => {
    if (!template || !templateName.trim()) {
      toast.error('Please enter a template name')
      return
    }

    if (templateExercises.length === 0) {
      toast.error('Please add at least one exercise')
      return
    }

    const updatedTemplate: WorkoutTemplate = {
      ...template,
      name: templateName.trim(),
      workoutSpaceId: selectedSpaceId,
      workoutSpaceName: selectedSpaceId === 'gym' ? 'Gym' : selectedSpaceId === 'home' ? 'Home' : 'Outdoor',
      exercises: templateExercises,
      exerciseCount: templateExercises.length
    }

    onSave(updatedTemplate)
    onOpenChange(false)
  }

  const addExercise = (exerciseId: string) => {
    const exercise = exercises.find(ex => ex.id === exerciseId)
    if (!exercise) return

    const newExercise: ExerciseConfig = {
      exerciseId,
      sets: 3,
      reps: 10,
      restTime: 60
    }

    setTemplateExercises(prev => [...prev, newExercise])
  }

  const removeExercise = (index: number) => {
    setTemplateExercises(prev => prev.filter((_, i) => i !== index))
  }

  const updateExercise = (index: number, field: keyof ExerciseConfig, value: number) => {
    setTemplateExercises(prev => 
      prev.map((exercise, i) => 
        i === index ? { ...exercise, [field]: value } : exercise
      )
    )
  }

  const getExerciseName = (exerciseId: string) => {
    return exercises.find(ex => ex.id === exerciseId)?.name || exerciseId
  }

  const getExerciseDescription = (exerciseId: string) => {
    return exercises.find(ex => ex.id === exerciseId)?.description || ''
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit Workout Template</DrawerTitle>
        </DrawerHeader>
        
        <div className="p-6 space-y-6">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="templateName">Template Name</Label>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter template name"
            />
          </div>

          {/* Workout Space */}
          <div className="space-y-2">
            <Label>Workout Space</Label>
            <select
              value={selectedSpaceId}
              onChange={(e) => setSelectedSpaceId(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background rounded-md"
            >
              <option value="gym">Gym</option>
              <option value="home">Home</option>
              <option value="outdoor">Outdoor</option>
            </select>
          </div>

          {/* Exercise List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Exercises ({templateExercises.length})</Label>
              <Button
                size="sm"
                onClick={() => {
                  // Show exercise selection modal or dropdown
                  const availableExercises = exercises.filter(ex => 
                    !templateExercises.some(te => te.exerciseId === ex.id)
                  )
                  if (availableExercises.length > 0) {
                    addExercise(availableExercises[0].id)
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Exercise
              </Button>
            </div>

            <div className="space-y-3">
              {templateExercises.map((exercise, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{getExerciseName(exercise.exerciseId)}</div>
                      <div className="text-sm text-muted-foreground">{getExerciseDescription(exercise.exerciseId)}</div>
                      
                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Sets</Label>
                          <Input
                            type="number"
                            value={exercise.sets}
                            onChange={(e) => updateExercise(index, 'sets', parseInt(e.target.value) || 0)}
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Reps</Label>
                          <Input
                            type="number"
                            value={exercise.reps}
                            onChange={(e) => updateExercise(index, 'reps', parseInt(e.target.value) || 0)}
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Rest (sec)</Label>
                          <Input
                            type="number"
                            value={exercise.restTime || 60}
                            onChange={(e) => updateExercise(index, 'restTime', parseInt(e.target.value) || 60)}
                            className="h-8"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExercise(index)}
                      className="ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

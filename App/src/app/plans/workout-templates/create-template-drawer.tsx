"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from 'sonner'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CreateTemplateDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (templateData: {
    name: string
    workoutSpaceId: string
    exercises: string[]
  }) => void
}

interface Exercise {
  id: string
  name: string
  description: string
  muscleGroups?: string[]
}

export function CreateTemplateDrawer({
  open,
  onOpenChange,
  onSave
}: CreateTemplateDrawerProps) {
  const [templateName, setTemplateName] = useState('')
  const [selectedSpaceId, setSelectedSpaceId] = useState('gym')
  const [selectedExercises, setSelectedExercises] = useState<string[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [searchTerm, setSearchTerm] = useState('')

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

  const handleSave = () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name')
      return
    }

    if (selectedExercises.length === 0) {
      toast.error('Please select at least one exercise')
      return
    }

    onSave({
      name: templateName.trim(),
      workoutSpaceId: selectedSpaceId,
      exercises: selectedExercises
    })

    // Reset form
    setTemplateName('')
    setSelectedExercises([])
    setSearchTerm('')
    onOpenChange(false)
  }

  const toggleExercise = (exerciseId: string) => {
    setSelectedExercises(prev => 
      prev.includes(exerciseId) 
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    )
  }

  const filteredExercises = exercises.filter(exercise =>
    exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exercise.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exercise.muscleGroups?.some(group => 
      group.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Create Workout Template</DrawerTitle>
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
            <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gym">Gym</SelectItem>
                <SelectItem value="home">Home</SelectItem>
                <SelectItem value="outdoor">Outdoor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Exercise Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Exercises ({selectedExercises.length} selected)</Label>
              <Input
                placeholder="Search exercises..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredExercises.map((exercise) => (
                <Card key={exercise.id} className="p-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={selectedExercises.includes(exercise.id)}
                      onCheckedChange={() => toggleExercise(exercise.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{exercise.name}</div>
                      <div className="text-sm text-muted-foreground">{exercise.description}</div>
                      {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {exercise.muscleGroups.map((group) => (
                            <Badge key={group} variant="outline" className="text-xs">
                              {group}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              Create Template
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

"use client"

import { useState, useEffect, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import { supabase } from '@/lib/supabaseClient'
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

interface WorkoutSpace {
  id: string
  name: string
}

interface CreateTemplateDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (template: {
    name: string
    workoutSpaceId: string
    exercises: string[]
  }) => void
}

export function CreateTemplateDrawer({ open, onOpenChange, onSave }: CreateTemplateDrawerProps) {
  const [name, setName] = useState('')
  const [workoutSpaceId, setWorkoutSpaceId] = useState('')
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set())
  
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [workoutSpaces, setWorkoutSpaces] = useState<WorkoutSpace[]>([])
  const [loading, setLoading] = useState(false)
  const [allowedExerciseIds, setAllowedExerciseIds] = useState<Set<string>>(new Set())

  // Load exercises and workout spaces (prefer DB, fallback to local JSONs)
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load exercises from Supabase or fallback to local JSONs
        const { data: exerciseData, error: exerciseError } = await supabase
          .from('exercises')
          .select('id, name, description, base_weight_factor')
          .order('name', { ascending: true })

        if (exerciseError) throw exerciseError

        if (exerciseData && exerciseData.length > 0) {
          const mapped: Exercise[] = exerciseData.map((row: any) => ({
            id: row.id as string,
            name: (row.name as string) ?? row.id,
            description: (row.description as string) ?? '',
            baseWeightFactor: Number(row.base_weight_factor ?? 1.0),
          }))
          setExercises(mapped)
        } else {
          // Fallback to local JSONs
          const [metaResponse, trainingResponse] = await Promise.all([
            fetch('/exercises_meta.json'),
            fetch('/exercises_training_data.json')
          ])
          
          const metaData = await metaResponse.json()
          const trainingData = await trainingResponse.json()
          
          const merged: Exercise[] = metaData.exercises.map((m: any) => {
            const training = trainingData.exercises.find((t: any) => t.id === m.id)
            return {
              id: m.id,
              name: m.name,
              description: m.description,
              baseWeightFactor: training?.baseWeightFactor ?? 1.0,
              muscleGroups: training?.muscleGroups ?? []
            }
          })
          setExercises(merged)
        }

        // Load workout spaces
        const { data: spaceData, error: spaceError } = await supabase
          .from('workout_spaces')
          .select('id, name')
          .order('name', { ascending: true })

        if (spaceError) throw spaceError
        setWorkoutSpaces((spaceData ?? []).map((r: any) => ({ 
          id: r.id as string, 
          name: r.name as string 
        })))
      } catch (err) {
        console.error('Failed to load data', err)
      }
    }

    if (open) {
      loadData()
    }
  }, [open])

  // When workout space changes, load allowed exercises for that space
  useEffect(() => {
    const loadAllowed = async () => {
      if (!open) return
      if (!workoutSpaceId) { setAllowedExerciseIds(new Set()); return }
      try {
        const { data, error } = await supabase
          .from('available_exercises_for_space')
          .select('exercise_id')
          .eq('space_id', workoutSpaceId)
        if (error) throw error
        const ids = new Set<string>((data ?? []).map((r: any) => r.exercise_id as string))
        setAllowedExerciseIds(ids)
      } catch (err) {
        console.error('Failed to load allowed exercises for space', err)
        // Fallback: allow all when view is not accessible
        setAllowedExerciseIds(new Set(exercises.map(e => e.id)))
      }
    }
    loadAllowed()
  }, [open, workoutSpaceId, exercises])

  // Filter exercises based on search
  const filteredExercises = useMemo(() => {
    const base = workoutSpaceId
      ? exercises.filter(e => allowedExerciseIds.has(e.id))
      : []
    if (!exerciseSearch) return base
    const searchLower = exerciseSearch.toLowerCase()
    return base.filter(exercise => 
      exercise.name.toLowerCase().includes(searchLower) ||
      exercise.description.toLowerCase().includes(searchLower)
    )
  }, [exercises, exerciseSearch, workoutSpaceId, allowedExerciseIds])

  const handleSave = () => {
    if (!name.trim() || !workoutSpaceId || selectedExercises.size === 0) return
    
    onSave({
      name: name.trim(),
      workoutSpaceId,
      exercises: Array.from(selectedExercises)
    })
    
    // Reset form
    setName('')
    setWorkoutSpaceId('')
    setExerciseSearch('')
    setSelectedExercises(new Set())
    onOpenChange(false)
  }

  const handleReset = () => {
    setName('')
    setWorkoutSpaceId('')
    setExerciseSearch('')
    setSelectedExercises(new Set())
  }

  const toggleExercise = (exerciseId: string, checked: boolean) => {
    const newSelected = new Set(selectedExercises)
    if (checked) {
      newSelected.add(exerciseId)
    } else {
      newSelected.delete(exerciseId)
    }
    setSelectedExercises(newSelected)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="data-[vaul-drawer-direction=right]:!w-[80vw] data-[vaul-drawer-direction=right]:!max-w-none lg:data-[vaul-drawer-direction=right]:!w-1/2">
        <div className="flex flex-col h-full">
          <DrawerHeader className="pb-0">
            <DrawerTitle>Create Workout Template</DrawerTitle>
          </DrawerHeader>

        <div className="px-4 space-y-6 flex-1 overflow-y-auto">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              placeholder="Enter template name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Workout Space Selection */}
          <div className="space-y-2">
            <Label htmlFor="workout-space">Workout Space</Label>
            <Select value={workoutSpaceId} onValueChange={setWorkoutSpaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a workout space" />
              </SelectTrigger>
              <SelectContent>
                {workoutSpaces.map((space) => (
                  <SelectItem key={space.id} value={space.id}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Exercise Search */}
          <div className="space-y-2">
            <Label htmlFor="exercise-search">Search Exercises</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="exercise-search"
                placeholder="Search exercises..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Exercise Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Select Exercises</Label>
              <Badge variant="secondary">
                {selectedExercises.size} selected
              </Badge>
            </div>
            
            <div className="overflow-y-auto space-y-2 border rounded-md p-3">
              {filteredExercises.map((exercise) => (
                <Checkbox
                  key={exercise.id}
                  variant="chip"
                  checked={selectedExercises.has(exercise.id)}
                  onCheckedChange={(checked) => toggleExercise(exercise.id, checked as boolean)}
                  className="w-full justify-between"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{exercise.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {exercise.description}
                    </span>
                  </div>
                </Checkbox>
              ))}
            </div>
          </div>
        </div>

        <DrawerFooter>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!name.trim() || !workoutSpaceId || selectedExercises.size === 0}
            >
              Save Template
            </Button>
          </div>
        </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
//
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { ExerciseLibrarySidebar } from './exercise-library-sidebar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { useUserTier } from '@/hooks/use-user-tier'
import { supabase } from '@/lib/supabaseClient'
import { Plus, Edit2, Trash2, Dumbbell, Target, Activity, PanelLeft, PanelRight, RefreshCw, CheckCircle, AlertCircle, Cloud } from 'lucide-react'

// Allowed workout types to be synced with Supabase
const ALLOWED_WORKOUT_TYPES: readonly string[] = [
  'Strength',
  'Speed and Power',
  'Agility and Coordination',
  'Stretching',
  'HIIT',
  'Functional',
  'Circuit',
  'Plyometrics',
  'Calisthenics',
  'Recovery',
  'Yoga',
  'Pilates',
  'Boxing',
  'Muay Thai',
  'Kickboxing',
  'Karate',
  'Taekwondo',
  'Jujitsu',
  'Wrestling',
  'Judo',
  'MMA',
  'Fencing',
  'Kendo',
  'Kung Fu (Wushu)',
  'Capoeira',
  'Aikido',
  'Sumo',
  'Aquatics',
  'Archery',
  'Badminton',
  'Basketball',
  'Beach Volleyball',
  'Breaking (breakdance)',
  'Canoe (Sprint & Slalom)',
  'Football',
  'Golf',
  'Gymnastics',
  'Handball',
  'Hockey',
  'Sport Climbing',
  'Swimming',
  'Tennis',
  'Table Tennis',
  'Weightlifting',
  'BodyWeight',
  'Cardio',
]

// Types
interface Exercise {
  id: string
  name: string
  description: string
  muscleGroups?: string[]
  workoutTypes?: string[]
  baseWeightFactor?: number
  muscleInvolvement?: Record<string, number>
  isCustom?: boolean
  userId?: string
  usageCount?: number
}

interface ExerciseFormData {
  name: string
  description: string
  muscleGroups: string[]
  workoutTypes: string[]
  baseWeightFactor: number
}

// Supabase row typing for custom_exercises table
interface SupabaseCustomExerciseRow {
  id: string
  user_id: string
  name: string
  description: string | null
  muscle_groups: string[] | null
  workout_types: string[] | null
  base_weight_factor: number | null
  muscle_involvement: Record<string, number> | null
  usage_count: number | null
}

export default function ExerciseLibraryPage() {
  const { currentTier, userId, isPaidTier } = useUserTier()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [customExercises, setCustomExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWorkoutType, setSelectedWorkoutType] = useState('all')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [formData, setFormData] = useState<ExerciseFormData>({
    name: '',
    description: '',
    muscleGroups: [],
    workoutTypes: [],
    baseWeightFactor: 1.0
  })

  const loadExercises = async () => {
    try {
      const [metaResponse, trainingResponse, workoutResponse] = await Promise.all([
        fetch('/exercises_meta.json'),
        fetch('/exercises_training_data.json'),
        fetch('/exercises_workout_types.json')
      ])

      const metaData = await metaResponse.json()
      const trainingData = await trainingResponse.json()
      const workoutData = await workoutResponse.json()

      // Combine all exercise data
      const combinedExercises = metaData.exercises.map((exercise: Exercise) => {
        const training = trainingData.exercises.find((t: Exercise) => t.id === exercise.id)
        const workout = workoutData.exercises.find((w: Exercise) => w.id === exercise.id)
        
        return {
          ...exercise,
          muscleGroups: training?.muscleGroups || [],
          baseWeightFactor: training?.baseWeightFactor || 1.0,
          muscleInvolvement: training?.muscleInvolvement || {},
          workoutTypes: (workout?.workoutTypes || []).filter((t: string) => ALLOWED_WORKOUT_TYPES.includes(t))
        }
      })

      setExercises(combinedExercises)
    } catch (error) {
      console.error('Error loading exercises:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCustomExercisesFromLocal = () => {
    try {
      const stored = localStorage.getItem('custom-exercises')
      if (stored) {
        setCustomExercises(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Error loading custom exercises from local storage:', error)
    }
  }

  const loadCustomExercisesFromSupabase = useCallback(async () => {
    if (!userId) return

    try {
      setSyncStatus('syncing')
      const { data, error } = await supabase
        .from('custom_exercises')
        .select('*')
        .eq('user_id', userId)

      if (error) throw error

      const customExercisesData = (data as SupabaseCustomExerciseRow[]).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? '',
        muscleGroups: item.muscle_groups || [],
        workoutTypes: (item.workout_types || []).filter((t: string) => ALLOWED_WORKOUT_TYPES.includes(t)),
        baseWeightFactor: item.base_weight_factor || 1.0,
        muscleInvolvement: item.muscle_involvement || {},
        isCustom: true,
        userId: item.user_id,
        usageCount: typeof item.usage_count === 'number' ? item.usage_count : 0,
      }))

      setCustomExercises(customExercisesData)
      setLastSyncTime(new Date())
      setSyncStatus('success')
    } catch (error) {
      console.error('Error loading custom exercises from Supabase:', error)
      setSyncStatus('error')
      toast.error('Sync failed - using local data')
      // Fallback to local storage
      loadCustomExercisesFromLocal()
    }
  }, [userId])

  // Load exercises data
  useEffect(() => {
    loadExercises()
  }, [])

  // Load custom exercises (local or synced)
  useEffect(() => {
    if (isPaidTier && userId) {
      loadCustomExercisesFromSupabase()
    } else {
      loadCustomExercisesFromLocal()
    }
  }, [isPaidTier, userId, loadCustomExercisesFromSupabase])

  const saveCustomExerciseToLocal = (exercise: Exercise) => {
    try {
      const updatedCustomExercises = editingExercise
        ? customExercises.map(ex => ex.id === editingExercise.id ? exercise : ex)
        : [...customExercises, exercise]
      
      setCustomExercises(updatedCustomExercises)
      localStorage.setItem('custom-exercises', JSON.stringify(updatedCustomExercises))
      toast.success(editingExercise ? 'Exercise updated locally' : 'Exercise created locally')
    } catch (error) {
      console.error('Error saving to local storage:', error)
      toast.error('Failed to save exercise locally')
    }
  }

  const deleteCustomExerciseFromLocal = (exerciseId: string) => {
    try {
      const updatedCustomExercises = customExercises.filter(ex => ex.id !== exerciseId)
      setCustomExercises(updatedCustomExercises)
      // Keep local cache updated for free users and as a fallback cache for paid users
      localStorage.setItem('custom-exercises', JSON.stringify(updatedCustomExercises))
      toast.success('Exercise deleted locally')
    } catch (error) {
      console.error('Error updating local storage on delete:', error)
      toast.error('Failed to delete exercise locally')
    }
  }

  const deleteCustomExerciseFromSupabase = async (exerciseId: string) => {
    if (!userId) return
    try {
      setSyncStatus('syncing')
      const { error } = await supabase
        .from('custom_exercises')
        .delete()
        .eq('id', exerciseId)
        .eq('user_id', userId)

      if (error) throw error

      const updatedCustomExercises = customExercises.filter(ex => ex.id !== exerciseId)
      setCustomExercises(updatedCustomExercises)
      // Update local cache so offline fallback stays in sync
      localStorage.setItem('custom-exercises', JSON.stringify(updatedCustomExercises))
      setLastSyncTime(new Date())
      setSyncStatus('success')
      toast.success('Exercise deleted and synced')
    } catch (error) {
      console.error('Error deleting from Supabase:', error)
      setSyncStatus('error')
      toast.error('Sync failed - deleted locally instead')
      // Fallback to local cache update so UI stays consistent and offline cache reflects deletion
      deleteCustomExerciseFromLocal(exerciseId)
    }
  }

  const saveCustomExerciseToSupabase = async (exercise: Exercise) => {
    if (!userId) return

    try {
      setSyncStatus('syncing')
      const exerciseData = {
        id: exercise.id,
        user_id: userId,
        name: exercise.name,
        description: exercise.description,
        muscle_groups: exercise.muscleGroups,
        workout_types: (exercise.workoutTypes || []).filter((t: string) => ALLOWED_WORKOUT_TYPES.includes(t)),
        base_weight_factor: exercise.baseWeightFactor,
        muscle_involvement: exercise.muscleInvolvement,
        usage_count: typeof exercise.usageCount === 'number' ? exercise.usageCount : 0,
      }

      if (editingExercise) {
        const { error } = await supabase
          .from('custom_exercises')
          .update(exerciseData)
          .eq('id', editingExercise.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('custom_exercises')
          .insert(exerciseData)

        if (error) throw error
      }

      const updatedCustomExercises = editingExercise
        ? customExercises.map(ex => ex.id === editingExercise.id ? exercise : ex)
        : [...customExercises, exercise]
      
      setCustomExercises(updatedCustomExercises)
      setLastSyncTime(new Date())
      setSyncStatus('success')
      toast.success(editingExercise ? 'Exercise updated and synced' : 'Exercise created and synced')
    } catch (error) {
      console.error('Error saving to Supabase:', error)
      setSyncStatus('error')
      toast.error('Sync failed - saved locally instead')
      // Fallback to local storage
      saveCustomExerciseToLocal(exercise)
    }
  }

  const handleSaveExercise = async () => {
    if (!formData.name.trim()) return

    const newExercise: Exercise = {
      id: editingExercise?.id || `custom-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      muscleGroups: formData.muscleGroups,
      workoutTypes: (formData.workoutTypes || []).filter((t: string) => ALLOWED_WORKOUT_TYPES.includes(t)),
      baseWeightFactor: formData.baseWeightFactor,
      muscleInvolvement: {},
      isCustom: true,
      userId: userId || undefined,
      usageCount: editingExercise?.usageCount ?? 0,
    }

    if (isPaidTier && userId) {
      await saveCustomExerciseToSupabase(newExercise)
    } else {
      saveCustomExerciseToLocal(newExercise)
    }

    resetForm()
    setIsAddDialogOpen(false)
    setEditingExercise(null)
  }

  const handleDeleteExercise = async (exerciseId: string) => {
    if (isPaidTier && userId) {
      await deleteCustomExerciseFromSupabase(exerciseId)
      return
    }
    deleteCustomExerciseFromLocal(exerciseId)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      muscleGroups: [],
      workoutTypes: [],
      baseWeightFactor: 1.0
    })
  }

  const handleEditExercise = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setFormData({
      name: exercise.name,
      description: exercise.description,
      muscleGroups: exercise.muscleGroups || [],
      workoutTypes: exercise.workoutTypes || [],
      baseWeightFactor: exercise.baseWeightFactor || 1.0
    })
    setIsAddDialogOpen(true)
  }

  // Aggregated filter options
  const allWorkoutTypes = useMemo(() => {
    const set = new Set<string>()
    ;[...exercises, ...customExercises].forEach((ex) => {
      ex.workoutTypes?.forEach((t) => {
        if (ALLOWED_WORKOUT_TYPES.includes(t)) set.add(t)
      })
    })
    return Array.from(set).sort()
  }, [exercises, customExercises])

  const allMuscleGroups = useMemo(() => {
    const set = new Set<string>()
    ;[...exercises, ...customExercises].forEach((ex) => {
      ex.muscleGroups?.forEach((g) => set.add(g))
    })
    return Array.from(set).sort()
  }, [exercises, customExercises])

  const muscleGroupOptions = useMemo(() => {
    if (selectedWorkoutType === 'all') return allMuscleGroups
    const set = new Set<string>()
    ;[...exercises, ...customExercises]
      .filter((ex) => ex.workoutTypes?.includes(selectedWorkoutType))
      .forEach((ex) => ex.muscleGroups?.forEach((g) => set.add(g)))
    return Array.from(set).sort()
  }, [allMuscleGroups, exercises, customExercises, selectedWorkoutType])

  // Filter exercises based on search, workout type, and muscle group
  const filteredExercises = useMemo(() => {
    let allExercises = [...exercises, ...customExercises]

    // Apply search filter
    if (searchTerm) {
      allExercises = allExercises.filter(exercise =>
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.muscleGroups?.some(group => 
          group.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // First level: workout type
    if (selectedWorkoutType !== 'all') {
      allExercises = allExercises.filter((exercise) =>
        exercise.workoutTypes?.includes(selectedWorkoutType)
      )
    }

    // Second level: muscle group
    if (selectedMuscleGroup !== 'all') {
      allExercises = allExercises.filter((exercise) =>
        exercise.muscleGroups?.includes(selectedMuscleGroup)
      )
    }

    return allExercises
  }, [exercises, customExercises, searchTerm, selectedWorkoutType, selectedMuscleGroup])



  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <ExerciseLibrarySidebar
        collapsed={sidebarCollapsed}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        workoutTypes={allWorkoutTypes}
        selectedWorkoutType={selectedWorkoutType}
        setSelectedWorkoutType={setSelectedWorkoutType}
        muscleGroups={muscleGroupOptions}
        selectedMuscleGroup={selectedMuscleGroup}
        setSelectedMuscleGroup={setSelectedMuscleGroup}
        isPaidTier={isPaidTier}
        lastSyncTime={lastSyncTime}
        syncStatus={syncStatus}
        onManualSync={isPaidTier && userId ? () => loadCustomExercisesFromSupabase() : undefined}
      />
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
          aria-hidden
        />
      )}
      
      <div className="flex-1 flex flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Exercise Library</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-3">
            {isPaidTier && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {syncStatus === 'syncing' && <RefreshCw className="h-4 w-4 animate-spin" />}
                {syncStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                {syncStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                {syncStatus === 'idle' && <Cloud className="h-4 w-4" />}
                <span className="hidden sm:inline">
                  {syncStatus === 'syncing' && 'Syncing...'}
                  {syncStatus === 'success' && 'Synced'}
                  {syncStatus === 'error' && 'Sync failed'}
                  {syncStatus === 'idle' && 'Cloud sync ready'}
                </span>
              </div>
            )}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingExercise(null) }}>
                  <Plus className="h-4 w-4" />
                  Add Exercise
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingExercise ? 'Edit Exercise' : 'Add New Exercise'}
                  </DialogTitle>
                  <DialogDescription>
                    {currentTier === 'Free' 
                      ? 'This exercise will be saved locally on your device.'
                      : 'This exercise will be synced to your account.'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Exercise name"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Exercise description"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Weight Factor</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="3"
                      value={formData.baseWeightFactor}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        baseWeightFactor: parseFloat(e.target.value) || 1.0 
                      }))}
                      placeholder="1.0"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Muscle Groups</label>
                    <div className="mt-2 grid grid-cols-2 gap-2 max-h-40 overflow-auto pr-1">
                      {allMuscleGroups.map((group: string) => (
                        <label key={group} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={formData.muscleGroups.includes(group)}
                            onCheckedChange={(checked) => {
                              setFormData((prev) => ({
                                ...prev,
                                muscleGroups: checked
                                  ? [...prev.muscleGroups, group]
                                  : prev.muscleGroups.filter((g) => g !== group),
                              }))
                            }}
                          />
                          <span className="truncate">{group}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Workout Types</label>
                    <div className="mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-auto pr-1">
                      {ALLOWED_WORKOUT_TYPES.map((type) => (
                        <label key={type} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={formData.workoutTypes.includes(type)}
                            onCheckedChange={(checked) => {
                              setFormData((prev) => ({
                                ...prev,
                                workoutTypes: checked
                                  ? [...prev.workoutTypes, type]
                                  : prev.workoutTypes.filter((t: string) => t !== type),
                              }))
                            }}
                          />
                          <span className="truncate">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsAddDialogOpen(false)
                    setEditingExercise(null)
                    resetForm()
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveExercise} disabled={!formData.name.trim()}>
                    {editingExercise ? 'Update' : 'Add'} Exercise
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 pt-4 pr-4 pb-4 pl-2 md:gap-6 md:pt-6 md:pr-6 md:pb-6 md:pl-6 overflow-auto">
          {/* Page Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Exercise Library</h1>
              <p className="text-muted-foreground">
                Browse exercises and create your own custom workouts
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-blue-100 p-2">
                  <Dumbbell className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Exercises</p>
                  <p className="text-2xl font-bold">{exercises.length}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-green-100 p-2">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custom Exercises</p>
                  <p className="text-2xl font-bold">{customExercises.length}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-purple-100 p-2">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Muscle Groups</p>
                  <p className="text-2xl font-bold">{allMuscleGroups.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Exercise Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExercises.map((exercise) => (
              <Card key={exercise.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg leading-tight">
                        {exercise.name}
                        {exercise.isCustom && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Custom
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {exercise.description}
                      </CardDescription>
                    </div>
                    
                    {exercise.isCustom && (
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleEditExercise(exercise)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteExercise(exercise.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Muscle Groups
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {exercise.muscleGroups.slice(0, 3).map((group) => (
                            <Badge key={group} variant="outline" className="text-xs">
                              {group}
                            </Badge>
                          ))}
                          {exercise.muscleGroups.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{exercise.muscleGroups.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {exercise.workoutTypes && exercise.workoutTypes.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Workout Types
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {exercise.workoutTypes.map((type) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {exercise.baseWeightFactor && (
                      <div className="text-xs text-muted-foreground">
                        Weight Factor: {exercise.baseWeightFactor}x
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredExercises.length === 0 && (
            <div className="text-center py-12">
              <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No exercises found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedWorkoutType !== 'all' || selectedMuscleGroup !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Add your first custom exercise to get started'}
              </p>
              {(!searchTerm && selectedWorkoutType === 'all' && selectedMuscleGroup === 'all') && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Exercise
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



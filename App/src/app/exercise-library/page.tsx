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
import { Plus, Edit2, Trash2, Dumbbell, Target, Activity, PanelLeft, PanelRight, RefreshCw, CheckCircle, AlertCircle, Cloud, Lock, XIcon } from 'lucide-react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { computeIdealWeight, type PersonalInputs } from '@/lib/idealWeight'
import { useSelectedUser } from '@/hooks/use-selected-user'

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
  const { user: selectedUser } = useSelectedUser()
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
  const [spaces, setSpaces] = useState<Array<{ id: string; name: string }>>([])
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('all')
  const [formData, setFormData] = useState<ExerciseFormData>({
    name: '',
    description: '',
    muscleGroups: [],
    workoutTypes: [],
    baseWeightFactor: 1.0
  })

  // Drawer state for exercise details
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerExercise, setDrawerExercise] = useState<Exercise | null>(null)

  // Placeholder to keep future usage-related side effects if needed

  // Statistics dialog state
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [statsMode, setStatsMode] = useState<'exercises' | 'muscle'>('exercises')
  const [personalInputs, setPersonalInputs] = useState<PersonalInputs | null>(null)

  const loadExercises = async () => {
    try {
      // Try Supabase first
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, description, base_weight_factor, exercise_muscles(involvement, muscles(name)), exercise_workout_types(workout_types(name))')
        .order('name', { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        const mapped: Exercise[] = data.map((row: Record<string, unknown>) => {
          const involvementEntries = (row.exercise_muscles ?? []).map((em: Record<string, unknown>) => ({ name: em.muscles?.name as string, involvement: em.involvement as number }))
          const muscleInvolvement: Record<string, number> = {}
          for (const { name, involvement } of involvementEntries) {
            if (name && typeof involvement === 'number' && involvement > 0) muscleInvolvement[name] = involvement
          }
          const muscleGroups = involvementEntries
            .filter((m: Record<string, unknown>) => m.name && m.involvement > 0)
            .map((m: Record<string, unknown>) => m.name as string)

          const workoutTypes = (row.exercise_workout_types ?? [])
            .map((ewt: Record<string, unknown>) => ewt.workout_types?.name as string)
            .filter((n: string | undefined): n is string => !!n && ALLOWED_WORKOUT_TYPES.includes(n))

          return {
            id: row.id as string,
            name: (row.name as string) ?? row.id,
            description: (row.description as string) ?? '',
            baseWeightFactor: Number(row.base_weight_factor ?? 1.0),
            muscleInvolvement,
            muscleGroups,
            workoutTypes,
          }
        })
        setExercises(mapped)
        return
      }

      // Fallback to public JSONs
      const [metaResponse, trainingResponse, workoutResponse] = await Promise.all([
        fetch('/exercises_meta.json'),
        fetch('/exercises_training_data.json'),
        fetch('/exercises_workout_types.json')
      ])

      const metaData = await metaResponse.json()
      const trainingData = await trainingResponse.json()
      const workoutData = await workoutResponse.json()

      const combinedExercises = metaData.exercises.map((exercise: Record<string, unknown>) => {
        const training = trainingData.exercises.find((t: Record<string, unknown>) => t.id === exercise.id)
        const workout = workoutData.exercises.find((w: Record<string, unknown>) => w.id === exercise.id)
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

          // Load saved personal inputs from ideal-exercise-weight (Personal tier)
  useEffect(() => {
    const loadPersonal = async () => {
      try {
        if (selectedUser) { setPersonalInputs(selectedUser.inputs); return }
        if (!isPaidTier || !userId) { setPersonalInputs(null); return }
        setPersonalInputs(null)
      } catch {
        setPersonalInputs(null)
      }
    }
    loadPersonal()
  }, [isPaidTier, userId, selectedUser])

  // Load user's workout spaces
  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        if (!userId) return
        const { data, error } = await supabase
          .from('workout_spaces')
          .select('id, name')
          .order('name', { ascending: true })
        if (error) throw error
        setSpaces((data ?? []).map((r) => ({ id: r.id as string, name: r.name as string })))
      } catch (err) {
        console.error('Failed to load workout spaces', err)
      }
    }
    fetchSpaces()
  }, [userId])

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

  // Maintain a cache of allowed exercise IDs for current space
  const [spaceAllowedExerciseIds, setSpaceAllowedExerciseIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        if (selectedSpaceId === 'all') {
          setSpaceAllowedExerciseIds(new Set())
          return
        }
        const { data, error } = await supabase
          .from('available_exercises_for_space')
          .select('exercise_id')
          .eq('space_id', selectedSpaceId)
        if (error) throw error
        const ids = new Set<string>((data ?? []).map((r: Record<string, unknown>) => r.exercise_id as string))
        setSpaceAllowedExerciseIds(ids)
      } catch (err) {
        console.error('Failed to fetch available exercises for space', err)
        setSpaceAllowedExerciseIds(new Set())
      }
    }
    fetchAvailability()
  }, [selectedSpaceId])

  // Filter exercises based on search, workout type, muscle group, and space availability
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

    // Third level: selected space availability
    if (selectedSpaceId !== 'all' && spaceAllowedExerciseIds.size > 0) {
      allExercises = allExercises.filter((exercise) => spaceAllowedExerciseIds.has(exercise.id))
    }

    return allExercises
  }, [exercises, customExercises, searchTerm, selectedWorkoutType, selectedMuscleGroup, selectedSpaceId, spaceAllowedExerciseIds])



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
        spaces={[{ id: 'all', name: 'All Spaces' }, ...spaces]}
        selectedSpaceId={selectedSpaceId}
        setSelectedSpaceId={setSelectedSpaceId}
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
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setIsStatsOpen(true)}>
                 Statistics
              </Button>
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
              <Card
                key={exercise.id}
                className="hover:shadow-md transition-all cursor-pointer hover:ring-1 hover:ring-white/20 hover:border-white/20"
                onClick={() => { setDrawerExercise(exercise); setIsDrawerOpen(true) }}
              >
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
                          onClick={(e) => { e.stopPropagation(); handleEditExercise(exercise) }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDeleteExercise(exercise.id) }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {typeof exercise.baseWeightFactor !== 'undefined' && personalInputs && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Ideal Weight: </span>
                        <span className="font-semibold tabular-nums">
                          {computeIdealWeight(personalInputs, Number(exercise.baseWeightFactor || 1)).toFixed(2)} kg
                        </span>
                      </div>
                    )}
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
      {/* Details Drawer */}
      <ExerciseDetailDrawer
        key={drawerExercise?.id || 'none'}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        exercise={drawerExercise}
        isPaidTier={isPaidTier}
      />

      {/* Statistics Drawer */}
      <Drawer open={isStatsOpen} onOpenChange={setIsStatsOpen} direction="right">
        <DrawerContent className="data-[vaul-drawer-direction=right]:!w-1/2 data-[vaul-drawer-direction=right]:!max-w-none">
          <div className="flex flex-col h-full">
            <DrawerHeader className="pb-0">
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-xl">Exercise Statistics</DrawerTitle>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" aria-label="Close statistics">
                    <XIcon className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            <div className="p-4 pt-2 space-y-4 overflow-auto">
              <Tabs value={statsMode} onValueChange={(v) => setStatsMode(v as 'exercises' | 'muscle')}>
                <TabsList className="grid grid-cols-2 w-full sm:w-auto">
                  <TabsTrigger value="exercises">Exercises</TabsTrigger>
                  <TabsTrigger value="muscle">Muscle Group</TabsTrigger>
                </TabsList>

                <TabsContent value="exercises" className="mt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <StatisticsExercisesChart
                      exercises={[...exercises, ...customExercises]}
                      workoutTypes={allWorkoutTypes}
                      initialType={selectedWorkoutType}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="muscle" className="mt-4">
                  <StatisticsChart mode="muscle" exercises={[...exercises, ...customExercises]} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

// Drawer UI for exercise details and videos
function ExerciseDetailDrawer({ open, onOpenChange, exercise, isPaidTier }: { open: boolean; onOpenChange: (v: boolean) => void; exercise: Exercise | null; isPaidTier: boolean }) {
  const [isSearching, setIsSearching] = useState(false)
  const [videoUrls, setVideoUrls] = useState<string[]>([])
  const [videoError, setVideoError] = useState<null | { code: 'missing_api_key' | 'quota_exceeded' | 'upstream_error' | 'no_results' | 'no_queries'; message: string }>(null)
  const [videoIndex, setVideoIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null)

  if (!exercise) return null

  const lastUsedLabel = (() => {
    // We compute from local inside parent effect and pass via closure? Simpler: recompute here too
    try {
      const possibleKeys = ['workout_plans_usage', 'workout-plans-usage', 'workoutHistory', 'workout-plans']
      let raw: unknown = null
      for (const key of possibleKeys) {
        const val = typeof window !== 'undefined' ? localStorage.getItem(key) : null
        if (val) { raw = JSON.parse(val); break }
      }
      if (raw && typeof raw === 'object' && exercise.id in (raw as Record<string, unknown>)) {
        const entry = (raw as Record<string, unknown>)[exercise.id]
        const dt = typeof entry?.lastUsedAt === 'string' ? new Date(entry.lastUsedAt) : null
        if (dt && !Number.isNaN(dt.getTime())) {
          const now = new Date()
          const diffMs = now.getTime() - dt.getTime()
          const diffMinutes = Math.floor(diffMs / 60000)
          if (diffMinutes < 60) return `${diffMinutes}m ago`
          const diffHours = Math.floor(diffMinutes / 60)
          if (diffHours < 24) return `${diffHours}h ago`
          return dt.toLocaleDateString()
        }
      }
    } catch (error) {
      console.error('Error processing last used data:', error)
    }
    return 'Never'
  })()

  const extractYouTubeId = (url: string): string | null => {
    try {
      const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/)
      if (shortMatch && shortMatch[1]) return shortMatch[1]
      const watchMatch = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/)
      if (watchMatch && watchMatch[1]) return watchMatch[1]
      const shortsMatch = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/)
      if (shortsMatch && shortsMatch[1]) return shortsMatch[1]
    } catch (error) {
      console.error('Error extracting YouTube ID:', error)
      return null
    }
    return null
  }
  const toYouTubeEmbedUrl = (url: string): string | null => {
    const id = extractYouTubeId(url)
    return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1` : null
  }
  const toYouTubeThumbnailUrl = (url: string): string | null => {
    const id = extractYouTubeId(url)
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
  }

  const searchVideos = async () => {
    if (!isPaidTier) return
    setIsSearching(true)
    setVideoError(null)
    setVideoUrls([])
    try {
      const response = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId: exercise.id, exerciseName: exercise.name }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok && Array.isArray(data.videos)) {
        setVideoUrls(data.videos)
        setVideoIndex(0)
      } else {
        setVideoError({ code: data.error || 'upstream_error', message: data.message || 'Video search failed. Try again later.' })
      }
    } catch {
      setVideoError({ code: 'upstream_error', message: 'Video search failed. Try again later.' })
    } finally {
      setIsSearching(false)
    }
  }

  const nextVideo = () => {
    if (videoUrls.length <= 1 || isTransitioning) return
    setIsTransitioning(true)
    setSlideDirection('left')
    setTimeout(() => { setVideoIndex((i) => (i + 1) % videoUrls.length); setIsTransitioning(false); setSlideDirection(null) }, 300)
  }
  const prevVideo = () => {
    if (videoUrls.length <= 1 || isTransitioning) return
    setIsTransitioning(true)
    setSlideDirection('right')
    setTimeout(() => { setVideoIndex((i) => (i - 1 + videoUrls.length) % videoUrls.length); setIsTransitioning(false); setSlideDirection(null) }, 300)
  }

  const usageConfig = { count: { label: 'Sessions', color: 'hsl(var(--primary))' } }
  const usageData = (() => {
    try {
      const possibleKeys = ['workout_plans_usage', 'workout-plans-usage', 'workoutHistory', 'workout-plans']
      let raw: unknown = null
      for (const key of possibleKeys) {
        const val = typeof window !== 'undefined' ? localStorage.getItem(key) : null
        if (val) { raw = JSON.parse(val); break }
      }
      if (raw && typeof raw === 'object' && exercise.id in (raw as Record<string, unknown>)) {
        const weekly = Array.isArray((raw as Record<string, unknown>)[exercise.id]?.weeklyCounts) ? (raw as Record<string, unknown>)[exercise.id].weeklyCounts as { label: string; count: number }[] : []
        return weekly.slice(-8)
      }
    } catch (error) {
      console.error('Error processing usage data:', error)
    }
    return Array.from({ length: 8 }).map((_, i) => ({ label: `W${i + 1}`, count: 0 }))
  })()

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="data-[vaul-drawer-direction=right]:!w-1/2 data-[vaul-drawer-direction=right]:!max-w-none">
        <div className="flex flex-col h-full">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="text-xl">{exercise.name}</DrawerTitle>
            {exercise.description && (
              <p className="text-sm text-muted-foreground mt-1">{exercise.description}</p>
            )}
          </DrawerHeader>
          <div className="p-4 pt-2 space-y-6 overflow-auto">
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {exercise.muscleGroups.map((g) => (
                    <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
                  ))}
                </div>
              )}
              {exercise.workoutTypes && exercise.workoutTypes.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {exercise.workoutTypes.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Usage</h4>
                <span className="text-xs text-muted-foreground">Last used: {lastUsedLabel}</span>
              </div>
              <ChartContainer id="usage" config={usageConfig} className="w-full h-56 aspect-auto">
                <BarChart data={usageData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} width={24} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            </div>

            {/* Videos */}
            <div className="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border py-4 shadow-sm border-border/50">
              <div className="px-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">Exercise Videos</CardTitle>
                  {isPaidTier ? (
                    <Button size="sm" onClick={searchVideos} disabled={isSearching}>
                      {isSearching ? 'Searching…' : 'Search video'}
                    </Button>
                  ) : (
                    <Button size="sm" asChild>
                      <a href="/account?tab=billing#plans">
                        <Lock className="h-3 w-3 mr-1" />
                        Upgrade plan
                      </a>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{isPaidTier ? `Results for ${exercise.name}` : `Upgrade to Personal or Trainer plan to search exercise videos`}</p>
              </div>

              <div className="px-4">
                {!isPaidTier ? (
                  <div className="flex items-center justify-center min-h-[320px]">
                    <div className="text-center space-y-4 max-w-md">
                      <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                        <Lock className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold">Exercise Videos Available with Upgrade</h3>
                      <p className="text-sm text-muted-foreground">
                        Get access to curated exercise tutorial videos from YouTube when you upgrade to Personal or Trainer plan.
                      </p>
                      <Button asChild className="mt-2">
                        <a href="/account?tab=billing#plans">Upgrade Now</a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Main video area */}
                    <div className="w-full rounded-md overflow-hidden bg-black aspect-video">
                      {videoUrls.length === 0 ? (
                        <div className="w-full h-full bg-muted/20 flex items-center justify-center">
                          <div className="text-center space-y-2 p-4">
                            {!videoError && !isSearching && <p className="text-sm text-muted-foreground">Start by clicking on the search button</p>}
                            {videoError?.code === 'quota_exceeded' && <p className="text-sm text-muted-foreground">Search limit reached (try again tomorrow)</p>}
                            {videoError && videoError.code !== 'quota_exceeded' && <p className="text-sm text-muted-foreground">{videoError.message || 'Try again later'}</p>}
                          </div>
                        </div>
                      ) : (
                        (() => {
                          const embedUrl = toYouTubeEmbedUrl(videoUrls[videoIndex])
                          return embedUrl ? (
                            <iframe
                              src={embedUrl}
                              title="YouTube video player"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                              frameBorder={0}
                              className="w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted/20" />
                          )
                        })()
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between">
                      <Button variant="outline" size="sm" onClick={prevVideo} disabled={videoUrls.length <= 1 || isTransitioning}>Previous</Button>
                      <div className="text-xs text-muted-foreground">{videoUrls.length > 0 ? `${videoIndex + 1} / ${videoUrls.length}` : '—'}</div>
                      <Button variant="outline" size="sm" onClick={nextVideo} disabled={videoUrls.length <= 1 || isTransitioning}>Next</Button>
                    </div>

                    {/* Thumbnails strip */}
                    {videoUrls.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto py-1">
                        {videoUrls.map((url, i) => {
                          const thumb = toYouTubeThumbnailUrl(url)
                          return (
                            <button
                              key={url + i}
                              onClick={() => setVideoIndex(i)}
                              className={`relative h-16 aspect-video rounded border overflow-hidden ${i === videoIndex ? 'ring-2 ring-primary' : ''}`}
                              aria-label={`Go to video ${i + 1}`}
                            >
                              {thumb ? (
                                <img src={thumb} alt="Video preview" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-muted" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

// Aggregated statistics chart by workout type or muscle group
function StatisticsChart({ mode, exercises }: { mode: 'workout' | 'muscle'; exercises: Array<{ id: string; workoutTypes?: string[]; muscleGroups?: string[]; usageCount?: number }> }) {
  const usageMap = useMemo(() => {
    try {
      const keys = ['workout_plans_usage', 'workout-plans-usage', 'workoutHistory', 'workout-plans']
      for (const k of keys) {
        const v = typeof window !== 'undefined' ? localStorage.getItem(k) : null
        if (v) return JSON.parse(v) as Record<string, unknown>
      }
    } catch (error) {
      console.error('Error loading usage map in StatisticsChart:', error)
    }
    return {} as Record<string, unknown>
  }, [])

  const getExerciseUsage = useCallback((exerciseId: string, fallback?: number) => {
    const entry = usageMap?.[exerciseId]
    if (entry && Array.isArray(entry.weeklyCounts)) {
      return (entry.weeklyCounts as Array<{ count: number }>).reduce((s, p) => s + (Number(p.count) || 0), 0)
    }
    if (typeof fallback === 'number') return fallback
    return 0
  }, [usageMap])

  const data = useMemo(() => {
    const combined = exercises
    if (mode === 'workout') {
      const typeSet = new Set<string>()
      combined.forEach(ex => ex.workoutTypes?.forEach(t => typeSet.add(t)))
      const types = Array.from(typeSet).sort()
      return types.map((type) => {
        let total = 0
        combined.forEach((ex) => { if (ex.workoutTypes?.includes(type)) total += getExerciseUsage(ex.id, ex.usageCount) })
        return { name: type, count: total }
      })
    }
    const groupSet = new Set<string>()
    combined.forEach(ex => ex.muscleGroups?.forEach(g => groupSet.add(g)))
    const groups = Array.from(groupSet).sort()
    return groups.map((group) => {
      let total = 0
      combined.forEach((ex) => { if (ex.muscleGroups?.includes(group)) total += getExerciseUsage(ex.id, ex.usageCount) })
      return { name: group, count: total }
    })
  }, [mode, exercises, getExerciseUsage])

  const config = { count: { label: 'Uses', color: 'hsl(var(--primary))' } }

  return (
    <div className="w-full">
      <ChartContainer id={`stats-${mode}`} config={config} className="w-full h-[60vh]">
        <BarChart data={data} layout="vertical">
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'hsl(var(--muted))' }} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}

function StatisticsExercisesChart({ exercises, workoutTypes, initialType }: { exercises: Array<{ id: string; name?: string; workoutTypes?: string[]; usageCount?: number }>; workoutTypes: string[]; initialType: string }) {
  const [selectedType, setSelectedType] = useState<string>(initialType && initialType !== 'all' ? initialType : (workoutTypes[0] || ''))

  const usageMap = useMemo(() => {
    try {
      const keys = ['workout_plans_usage', 'workout-plans-usage', 'workoutHistory', 'workout-plans']
      for (const k of keys) {
        const v = typeof window !== 'undefined' ? localStorage.getItem(k) : null
        if (v) return JSON.parse(v) as Record<string, unknown>
      }
    } catch (error) {
      console.error('Error loading usage map in StatisticsExercisesChart:', error)
    }
    return {} as Record<string, unknown>
  }, [])

  const getExerciseUsage = useCallback((exerciseId: string, fallback?: number) => {
    const entry = usageMap?.[exerciseId]
    if (entry && Array.isArray(entry.weeklyCounts)) {
      return (entry.weeklyCounts as Array<{ count: number }>).reduce((s, p) => s + (Number(p.count) || 0), 0)
    }
    if (typeof fallback === 'number') return fallback
    return 0
  }, [usageMap])

  const filtered = useMemo(() => {
    if (!selectedType) return [] as Array<{ name: string; count: number }>
    const subset = exercises.filter(ex => ex.workoutTypes?.includes(selectedType))
    return subset
      .map(ex => ({ name: ex.name || ex.id, count: getExerciseUsage(ex.id, ex.usageCount) }))
      .sort((a, b) => b.count - a.count)
  }, [exercises, selectedType, getExerciseUsage])

  const config = { count: { label: 'Uses', color: 'hsl(var(--primary))' } }

  return (
    <div className="w-full space-y-3">
      <div className="w-full max-w-xs">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full h-9 bg-background border-border">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {workoutTypes.map((t) => (
              <SelectItem key={t} value={t} className="cursor-pointer">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ChartContainer id={`stats-exercises-${selectedType}`} config={config} className="w-full h-[60vh]">
        <BarChart data={filtered} layout="vertical">
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={180} interval={0} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'hsl(var(--muted))' }} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}



"use client"

import { useEffect, useRef, useState } from 'react'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { supabase } from '@/lib/supabaseClient'
import { Cloud, RefreshCw, CheckCircle, AlertCircle, Pencil } from "lucide-react"
import { UserSwitcher } from '@/components/user-switcher'
import { useSelectedUser } from '@/hooks/use-selected-user'

interface IdealExerciseWeightSidebarProps {
  side?: "left" | "right"

  // User input states
  bodyWeight: number
  setBodyWeight: (value: number) => void
  height: number
  setHeight: (value: number) => void
  age: number
  setAge: (value: number) => void
  gender: string
  setGender: (value: string) => void
  experience: string
  setExperience: (value: string) => void
  skeletalMuscleMass: number
  setSkeletalMuscleMass: (value: number) => void
  bodyFatMass: number
  setBodyFatMass: (value: number) => void
  selectedExerciseId: string
  setSelectedExerciseId: (value: string) => void
  
  isLoadingExercises: boolean
  exerciseLoadError: string | null
  
  // Experience factors
  experienceFactors: { [key: string]: { factor: number; label: string } }

  // Collapsed state controlled by parent
  collapsed: boolean
  
  // Sync status callbacks
  onSyncStatusChange?: (status: 'idle' | 'syncing' | 'success' | 'error') => void
  onLastSyncTimeChange?: (time: Date | null) => void
}

export function IdealExerciseWeightSidebar({
  bodyWeight,
  setBodyWeight,
  height,
  setHeight,
  age,
  setAge,
  gender,
  setGender,
  experience,
  setExperience,
  skeletalMuscleMass,
  setSkeletalMuscleMass,
  bodyFatMass,
  setBodyFatMass,
  selectedExerciseId,
  setSelectedExerciseId,
  experienceFactors,
  collapsed,
  onSyncStatusChange,
  onLastSyncTimeChange,
}: IdealExerciseWeightSidebarProps) {
  type UserInfo = { id: string; email: string | null; name: string | null; avatarUrl: string | null }
  const [user, setUser] = useState<UserInfo | null>(null)
  type SavedPersonalData = {
    bodyWeight?: number
    height?: number
    age?: number
    gender?: string
    experience?: string
    skeletalMuscleMass?: number
    bodyFatMass?: number
    selectedExerciseId?: string
    updatedAt?: string
  }

  const { user: selected } = useSelectedUser()
  const [isEditing, setIsEditing] = useState(false)
  const [bodyWeightInput, setBodyWeightInput] = useState(String(bodyWeight))
  const [heightInput, setHeightInput] = useState(String(height))
  const [ageInput, setAgeInput] = useState(String(age))
  const [skeletalMuscleMassInput, setSkeletalMuscleMassInput] = useState(String(skeletalMuscleMass))
  const [bodyFatMassInput, setBodyFatMassInput] = useState(String(bodyFatMass))

  const [currentPlan, setCurrentPlan] = useState<string>('Free')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const debounceTimerRef = useRef<number | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState<SavedPersonalData | null>(null)

  // Sync local inputs with prop values
  useEffect(() => { setBodyWeightInput(String(bodyWeight)) }, [bodyWeight])
  useEffect(() => { setHeightInput(String(height)) }, [height])
  useEffect(() => { setAgeInput(String(age)) }, [age])
  useEffect(() => { setSkeletalMuscleMassInput(String(skeletalMuscleMass)) }, [skeletalMuscleMass])
  useEffect(() => { setBodyFatMassInput(String(bodyFatMass)) }, [bodyFatMass])

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      const u = data.session?.user ?? null
      setUser(
        u
          ? {
              id: u.id,
              email: u.email ?? null,
              name: (u.user_metadata?.full_name || u.user_metadata?.name || null) as string | null,
              avatarUrl: (u.user_metadata?.avatar_url || null) as string | null,
            }
          : null
      )
    }
    void init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(
        u
          ? {
              id: u.id,
              email: u.email ?? null,
              name: (u.user_metadata?.full_name || u.user_metadata?.name || null) as string | null,
              avatarUrl: (u.user_metadata?.avatar_url || null) as string | null,
            }
          : null
      )
    })
    return () => subscription.unsubscribe()
  }, [])

  // Sync current plan from Supabase and localStorage
  useEffect(() => {
    const fetchPlan = async () => {
      const { data } = await supabase.auth.getSession()
      const metaPlan = (data.session?.user?.user_metadata?.plan as string | undefined) || null
      const storedPlan = typeof window !== 'undefined'
        ? ((localStorage.getItem('fitspo:plan') as string | null) || (localStorage.getItem('stronk:plan') as string | null))
        : null
      setCurrentPlan(metaPlan || storedPlan || 'Free')
    }
    void fetchPlan()

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      const uPlan = (s?.user?.user_metadata?.plan as string | undefined) || null
      const lsPlan = typeof window !== 'undefined'
        ? ((localStorage.getItem('fitspo:plan') as string | null) || (localStorage.getItem('stronk:plan') as string | null))
        : null
      setCurrentPlan(uPlan || lsPlan || 'Free')
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Load saved personal details for Personal tier on sign-in
  useEffect(() => {
    const loadPersonalDetails = async () => {
      if (!user?.id || currentPlan !== 'Personal') return
      const { data } = await supabase.auth.getSession()
      const u = data.session?.user
      const savedNew = (u?.user_metadata?.fitspo_personal as unknown) || null
      const savedOld = (u?.user_metadata?.stronk_personal as unknown) || null
      const savedRaw = savedNew || savedOld || null
      // Seamless migration: if old exists and new doesn't, copy to new key
      if (!savedNew && savedOld) {
        try {
          await supabase.auth.updateUser({ data: { fitspo_personal: savedOld as Record<string, unknown> } })
        } catch (e) {
          console.warn('Migration copy failed', e)
        }
      }
      if (savedRaw && typeof savedRaw === 'object') {
        const saved = savedRaw as SavedPersonalData
        if (typeof saved.bodyWeight === 'number') setBodyWeight(saved.bodyWeight)
        if (typeof saved.height === 'number') setHeight(saved.height)
        if (typeof saved.age === 'number') setAge(saved.age)
        if (typeof saved.gender === 'string') setGender(saved.gender)
        if (typeof saved.experience === 'string') setExperience(saved.experience)
        if (typeof saved.skeletalMuscleMass === 'number') setSkeletalMuscleMass(saved.skeletalMuscleMass)
        if (typeof saved.bodyFatMass === 'number') setBodyFatMass(saved.bodyFatMass)
        // Only set selected exercise from saved data if not already chosen in this session
        if (!selectedExerciseId && typeof saved.selectedExerciseId === 'string') {
          setSelectedExerciseId(saved.selectedExerciseId)
        }
        if (typeof saved.updatedAt === 'string') {
          const dt = new Date(saved.updatedAt)
          if (!Number.isNaN(dt.getTime())) {
            setLastSyncedAt(dt)
            onLastSyncTimeChange?.(dt)
          }
        }
        setSavedSnapshot({
          bodyWeight: saved.bodyWeight,
          height: saved.height,
          age: saved.age,
          gender: saved.gender,
          experience: saved.experience,
          skeletalMuscleMass: saved.skeletalMuscleMass,
          bodyFatMass: saved.bodyFatMass,
          selectedExerciseId: saved.selectedExerciseId,
          updatedAt: saved.updatedAt,
        })
      }
    }
    void loadPersonalDetails()
  }, [user?.id, currentPlan, selectedExerciseId, setBodyWeight, setHeight, setAge, setGender, setExperience, setSkeletalMuscleMass, setBodyFatMass, setSelectedExerciseId])

  // Ensure migration runs even outside Personal plan context
  useEffect(() => {
    const migrateIfNeeded = async () => {
      if (!user?.id) return
      const { data } = await supabase.auth.getSession()
      const u = data.session?.user
      const savedNew = (u?.user_metadata?.fitspo_personal as unknown) || null
      const savedOld = (u?.user_metadata?.stronk_personal as unknown) || null
      if (!savedNew && savedOld) {
        try {
          await supabase.auth.updateUser({ data: { fitspo_personal: savedOld as Record<string, unknown> } })
        } catch (e) {
          console.warn('Migration copy failed', e)
        }
      }
    }
    void migrateIfNeeded()
  }, [user?.id])

  // Initialize baseline snapshot when user signs in or plan context changes and no snapshot exists
  useEffect(() => {
    if (!savedSnapshot && user?.id) {
      setSavedSnapshot({
        bodyWeight,
        height,
        age,
        gender,
        experience,
        skeletalMuscleMass,
        bodyFatMass,
        selectedExerciseId,
      })
    }
  }, [user?.id, currentPlan, bodyWeight, height, age, gender, experience, skeletalMuscleMass, bodyFatMass, selectedExerciseId])

  // Track pending changes by comparing current values to last saved snapshot
  useEffect(() => {
    if (!savedSnapshot) {
      return
    }
    // This effect is kept for potential future use but currently doesn't set any state
  }, [bodyWeight, height, age, gender, experience, skeletalMuscleMass, bodyFatMass, selectedExerciseId, savedSnapshot])

  const handleManualSync = async () => {
    if (!user?.id || currentPlan !== 'Personal') return
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
    setIsSyncing(true)
    setSyncError(null)
    onSyncStatusChange?.('syncing')
    try {
      const payload: { fitspo_personal: Record<string, unknown> } = {
        fitspo_personal: {
          bodyWeight,
          height,
          age,
          gender,
          experience,
          skeletalMuscleMass,
          bodyFatMass,
          selectedExerciseId,
          updatedAt: new Date().toISOString(),
        },
      }
      const { error } = await supabase.auth.updateUser({ data: payload })
      if (error) throw error
      const now = new Date()
      setLastSyncedAt(now)
      setSavedSnapshot({
        bodyWeight,
        height,
        age,
        gender,
        experience,
        skeletalMuscleMass,
        bodyFatMass,
        selectedExerciseId,
        updatedAt: now.toISOString(),
      })
      onLastSyncTimeChange?.(now)
      onSyncStatusChange?.('success')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to sync'
      setSyncError(message)
      onSyncStatusChange?.('error')
    } finally {
      setIsSyncing(false)
    }
  }

  // Update form and local state when selected user changes
  useEffect(() => {
    if (!selected) return
    setBodyWeight(selected.inputs.bodyWeight)
    setHeight(selected.inputs.height)
    setAge(selected.inputs.age)
    setGender(selected.inputs.gender)
    setExperience(selected.inputs.experience)
    setSkeletalMuscleMass(selected.inputs.skeletalMuscleMass)
    setBodyFatMass(selected.inputs.bodyFatMass)
    // Also update the local input states
    setBodyWeightInput(String(selected.inputs.bodyWeight))
    setHeightInput(String(selected.inputs.height))
    setAgeInput(String(selected.inputs.age))
    setSkeletalMuscleMassInput(String(selected.inputs.skeletalMuscleMass))
    setBodyFatMassInput(String(selected.inputs.bodyFatMass))
  }, [selected?.id, setBodyWeight, setHeight, setAge, setGender, setExperience, setSkeletalMuscleMass, setBodyFatMass])

  // Listen for users_updated events to refresh selected user data
  useEffect(() => {
    const handleUsersUpdated = () => {
      // If we have a selected user, refresh their data
      if (selected) {
        // Trigger a reload of the selected user data
        window.dispatchEvent(new Event('fitspo:selected_user_changed'))
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('fitspo:users_updated', handleUsersUpdated)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('fitspo:users_updated', handleUsersUpdated)
      }
    }
  }, [selected])

  const formatSyncTime = (date: Date | null) => {
    if (!date) return 'Never'
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    
    if (diffSeconds < 60) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  const getSyncIcon = () => {
    switch (true) {
      case isSyncing:
        return <RefreshCw className="h-3 w-3 animate-spin" />
      case !syncError && lastSyncedAt !== null:
        return <CheckCircle className="h-3 w-3 text-green-600" />
      case syncError !== null:
        return <AlertCircle className="h-3 w-3 text-red-600" />
      default:
        return <Cloud className="h-3 w-3" />
    }
  }

  const getSyncStatus = () => {
    switch (true) {
      case isSyncing:
        return 'Syncing...'
      case !syncError && lastSyncedAt !== null:
        return 'Synced'
      case syncError !== null:
        return 'Sync failed'
      default:
        return 'Ready'
    }
  }

  return (
    <div
      className={[
        collapsed
          ? 'hidden'
          : 'fixed inset-y-0 left-0 z-50 w-96 max-w-[85vw] shadow-lg lg:static lg:w-72 lg:max-w-none',
        'border-r bg-background flex flex-col h-full transition-all p-0'
      ].join(' ')}
    >
      <div className="p-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Cloud className="h-6 w-6 text-primary" />
            {!collapsed && (
              <h2 className="text-sm font-semibold">Exercise weights</h2>
            )}
          </div>
        </div>
        {user?.email && currentPlan === 'Personal' && !collapsed && (
          <>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Sync Status</Label>
                <div className="p-3 rounded-md bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getSyncIcon()}
                      <span className="text-xs font-medium">{getSyncStatus()}</span>
                    </div>
                    {!isSyncing && (
                      <button
                        onClick={handleManualSync}
                        className="p-1 hover:bg-background rounded transition-colors"
                        title="Manual sync"
                        disabled={!user?.id}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Cloud className="h-3 w-3" />
                    <span>Last sync: {formatSyncTime(lastSyncedAt)}</span>
                  </div>
                </div>
              </div>
              <Separator className="my-1" />
            </div>
          </>
        )}
      </div>

      {!collapsed && (
      <div className="flex-1 overflow-auto">
        <div className="p-2">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">User</Label>
              <UserSwitcher />
            </div>

            {selected && (
              <div className="space-y-2">
                <Button variant="secondary" className="w-full" onClick={() => setIsEditing((v) => !v)}>
                  <Pencil className="h-4 w-4 mr-2" /> {isEditing ? 'Cancel edit' : 'Edit user'}
                </Button>
              </div>
            )}

            {!selected && (
              <div className="text-xs text-muted-foreground">Select a user to personalize calculations.</div>
            )}

            <Separator className="my-4" />

            {/* Personal Details Panel - now read-only when user is selected */}
            <div className="space-y-5">
              <div className="flex items-center mb-3">
                <Cloud className="mr-2 h-4 w-4" />
                <span className="text-sm font-medium">Personal Details</span>
                {selected && (
                  <span className="ml-2 text-xs text-muted-foreground">(from selected user)</span>
                )}
              </div>

              {/* Body Weight */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Body Weight</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      min={40}
                      max={150}
                      value={bodyWeightInput}
                      onChange={(e) => setBodyWeightInput(e.target.value)}
                      onBlur={() => {
                        const parsed = Number(bodyWeightInput)
                        if (!Number.isNaN(parsed)) {
                          const clamped = Math.min(150, Math.max(40, parsed))
                          setBodyWeight(clamped)
                        } else {
                          setBodyWeightInput(String(bodyWeight))
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      className="h-8 w-14 text-right"
                      disabled={!!selected && !isEditing}
                    />
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                </div>
                <div className="p-0">
                  <Slider
                    min={40}
                    max={150}
                    step={1}
                    value={[bodyWeight]}
                    onValueChange={(value) => setBodyWeight(value[0])}
                    className="w-full cursor-pointer"
                    disabled={!!selected && !isEditing}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>40kg</span>
                    <span>150kg</span>
                  </div>
                </div>
              </div>

              {/* Height */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Height</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      min={140}
                      max={220}
                      value={heightInput}
                      onChange={(e) => setHeightInput(e.target.value)}
                      onBlur={() => {
                        const parsed = Number(heightInput)
                        if (!Number.isNaN(parsed)) {
                          const clamped = Math.min(220, Math.max(140, parsed))
                          setHeight(clamped)
                        } else {
                          setHeightInput(String(height))
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      className="h-8 w-14 text-right"
                      disabled={!!selected && !isEditing}
                    />
                    <span className="text-xs text-muted-foreground">cm</span>
                  </div>
                </div>
                <div className="p-0">
                  <Slider
                    min={140}
                    max={220}
                    step={1}
                    value={[height]}
                    onValueChange={(value) => setHeight(value[0])}
                    className="w-full cursor-pointer"
                    disabled={!!selected && !isEditing}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>140cm</span>
                    <span>220cm</span>
                  </div>
                </div>
              </div>

              {/* Age */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Age</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      min={15}
                      max={80}
                      value={ageInput}
                      onChange={(e) => setAgeInput(e.target.value)}
                      onBlur={() => {
                        const parsed = Number(ageInput)
                        if (!Number.isNaN(parsed)) {
                          const clamped = Math.min(80, Math.max(15, parsed))
                          setAge(clamped)
                        } else {
                          setAgeInput(String(age))
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      className="h-8 w-14 text-right"
                      disabled={!!selected && !isEditing}
                    />
                    <span className="text-xs text-muted-foreground">years</span>
                  </div>
                </div>
                <div className="p-0">
                  <Slider
                    min={15}
                    max={80}
                    step={1}
                    value={[age]}
                    onValueChange={(value) => setAge(value[0])}
                    className="w-full cursor-pointer"
                    disabled={!!selected && !isEditing}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>15</span>
                    <span>80</span>
                  </div>
                </div>
              </div>

              {/* Skeletal Muscle Mass (SMM) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Skeletal Muscle Mass (SMM)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      min={10}
                      max={200}
                      value={skeletalMuscleMassInput}
                      onChange={(e) => setSkeletalMuscleMassInput(e.target.value)}
                      onBlur={() => {
                        const parsed = Number(skeletalMuscleMassInput)
                        if (!Number.isNaN(parsed)) {
                          const clamped = Math.min(200, Math.max(10, parsed))
                          setSkeletalMuscleMass(clamped)
                        } else {
                          setSkeletalMuscleMassInput(String(skeletalMuscleMass))
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      className="h-8 w-14 text-right"
                      disabled={!!selected && !isEditing}
                    />
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                </div>
                <div className="p-0">
                  <Slider
                    min={10}
                    max={200}
                    step={1}
                    value={[skeletalMuscleMass]}
                    onValueChange={(value) => setSkeletalMuscleMass(value[0])}
                    className="w-full cursor-pointer"
                    disabled={!!selected && !isEditing}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>10kg</span>
                    <span>200kg</span>
                  </div>
                </div>
              </div>

              {/* Body Fat Mass (BFM) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Body Fat Mass (BFM)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      min={2}
                      max={200}
                      value={bodyFatMassInput}
                      onChange={(e) => setBodyFatMassInput(e.target.value)}
                      onBlur={() => {
                        const parsed = Number(bodyFatMassInput)
                        if (!Number.isNaN(parsed)) {
                          const clamped = Math.min(200, Math.max(2, parsed))
                          setBodyFatMass(clamped)
                        } else {
                          setBodyFatMassInput(String(bodyFatMass))
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      className="h-8 w-14 text-right"
                      disabled={!!selected && !isEditing}
                    />
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                </div>
                <div className="p-0">
                  <Slider
                    min={2}
                    max={200}
                    step={1}
                    value={[bodyFatMass]}
                    onValueChange={(value) => setBodyFatMass(value[0])}
                    className="w-full cursor-pointer"
                    disabled={!!selected && !isEditing}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>2kg</span>
                    <span>200kg</span>
                  </div>
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Gender</Label>
                <Select value={gender} onValueChange={setGender} disabled={!!selected && !isEditing}>
                  <SelectTrigger className="w-full h-10 bg-background border-border hover:bg-accent hover:text-accent-foreground transition-colors">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectItem value="male" className="cursor-pointer">
                      <div className="flex items-center justify-center space-x-2">
                        <Cloud className="h-4 w-4" />
                        <span>Male</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="female" className="cursor-pointer">
                      <div className="flex items-center justify-center space-x-2">
                        <Cloud className="h-4 w-4" />
                        <span>Female</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Experience Level */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Experience Level</Label>
                <Select value={experience} onValueChange={setExperience} disabled={!!selected && !isEditing}>
                  <SelectTrigger className="w-full h-10 bg-background border-border hover:bg-accent hover:text-accent-foreground transition-colors">
                    <SelectValue placeholder="Select experience" />
                  </SelectTrigger>
                  <SelectContent className="w-full max-h-60">
                    {Object.entries(experienceFactors).map(([key, value]) => (
                      <SelectItem key={key} value={key} className="cursor-pointer py-3">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">
                            {(() => {
                              const match = value.label.match(/\(([^)]+)\)/)
                              const inside = match ? match[1] : ''
                              const parts = inside.split(',').map(s => s.trim()).filter(Boolean)
                              return parts.length ? parts[parts.length - 1] : value.label
                            })()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {value.label.split('(')[0].trim()}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Save Changes Button - Below the sidebar */}
      <div className="p-4 border-t bg-background">
        <Button
          onClick={async () => {
            if (!selected) return
            try {
              setIsSyncing(true)
              setSyncError(null)
              // Save to managed_users table
              await supabase.from('managed_users').update({
                body_weight_kg: bodyWeight,
                height_cm: height,
                age: age,
                gender: gender,
                experience: experience,
                skeletal_muscle_mass_kg: skeletalMuscleMass,
                body_fat_mass_kg: bodyFatMass,
              }).eq('id', selected.id)
              
              // Notify other pages that users data has been updated
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('fitspo:users_updated'))
              }
              
              setIsEditing(false)
              onSyncStatusChange?.('success')
            } catch {
              setSyncError('Failed to save to database')
              onSyncStatusChange?.('error')
            } finally {
              setIsSyncing(false)
            }
          }}
          disabled={!selected || !isEditing || isSyncing}
          className="w-full"
        >
          {isSyncing ? 'Saving...' : 'Save changes'}
        </Button>
        {syncError && (
          <div className="text-xs text-red-600 mt-2 text-center">{syncError}</div>
        )}
      </div>
    </div>
  )
}

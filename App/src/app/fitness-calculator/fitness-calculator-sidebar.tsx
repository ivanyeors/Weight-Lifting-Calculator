"use client"

import { useEffect, useRef, useState } from 'react'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { supabase } from '@/lib/supabaseClient'

import { User, UserCheck, Users, Calculator } from "lucide-react"

interface FitnessCalculatorSidebarProps {
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
}

export function FitnessCalculatorSidebar({
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
}: FitnessCalculatorSidebarProps) {
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
  
  const [bodyWeightInput, setBodyWeightInput] = useState(String(bodyWeight))
  const [heightInput, setHeightInput] = useState(String(height))
  const [ageInput, setAgeInput] = useState(String(age))
  const [skeletalMuscleMassInput, setSkeletalMuscleMassInput] = useState(String(skeletalMuscleMass))
  const [bodyFatMassInput, setBodyFatMassInput] = useState(String(bodyFatMass))
  const [currentPlan, setCurrentPlan] = useState<string>('Free')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [hasPendingChanges, setHasPendingChanges] = useState(false)
  const debounceTimerRef = useRef<number | null>(null)

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
          if (!Number.isNaN(dt.getTime())) setLastSyncedAt(dt)
        }
        setHasPendingChanges(false)
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

  // Debounced auto-sync to Supabase for Personal tier
  useEffect(() => {
    if (!user?.id || currentPlan !== 'Personal') return
    setHasPendingChanges(true)
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = window.setTimeout(async () => {
      setIsSyncing(true)
      setSyncError(null)
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
        setLastSyncedAt(new Date())
        setHasPendingChanges(false)
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to sync'
        setSyncError(message)
      } finally {
        setIsSyncing(false)
      }
    }, 800)

    return () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
    }
  }, [bodyWeight, height, age, gender, experience, skeletalMuscleMass, bodyFatMass, selectedExerciseId, user?.id, currentPlan])

  const handleManualSync = async () => {
    if (!user?.id || currentPlan !== 'Personal') return
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
    setIsSyncing(true)
    setSyncError(null)
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
      setLastSyncedAt(new Date())
      setHasPendingChanges(false)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to sync'
      setSyncError(message)
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => { setBodyWeightInput(String(bodyWeight)) }, [bodyWeight])
  useEffect(() => { setHeightInput(String(height)) }, [height])
  useEffect(() => { setAgeInput(String(age)) }, [age])
  useEffect(() => { setSkeletalMuscleMassInput(String(skeletalMuscleMass)) }, [skeletalMuscleMass])
  useEffect(() => { setBodyFatMassInput(String(bodyFatMass)) }, [bodyFatMass])

  return (
    <div
      className={[
        collapsed
          ? 'hidden lg:block lg:w-14'
          : 'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-lg lg:static lg:w-56 lg:max-w-none',
        'border-r bg-background flex flex-col h-full transition-all'
      ].join(' ')}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Calculator className="h-6 w-6 text-primary" />
            {!collapsed && (
              <h2 className="text-lg font-semibold">Fitness Calculator</h2>
            )}
          </div>
        </div>
        {user?.email && currentPlan === 'Personal' && (
          !collapsed && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={[
                  "inline-block size-2 rounded-full aspect-square shrink-0 flex-none",
                  isSyncing
                    ? "bg-amber-500 animate-pulse"
                    : syncError
                    ? "bg-red-500"
                    : hasPendingChanges
                    ? "bg-amber-500"
                    : "bg-emerald-500",
                ].join(' ')}
                aria-label={isSyncing ? 'Syncing' : syncError ? 'Sync error' : hasPendingChanges ? 'Pending changes' : 'Synced'}
              />
              <span>
                {isSyncing
                  ? 'Syncing…'
                  : syncError
                  ? 'Sync failed'
                  : `Last sync: ${lastSyncedAt ? lastSyncedAt.toLocaleString() : 'never'}`}
              </span>
            </div>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleManualSync} disabled={isSyncing || !user?.id}>
              Sync now
            </Button>
          </div>
          )
        )}
      </div>

      {!collapsed && (
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-2">
          <div className="flex items-center mb-3">
            <User className="mr-2 h-4 w-4" />
            <span className="text-sm font-medium">Personal Details</span>
          </div>
          <div className="space-y-5">
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
                    />
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                </div>
                <div className="px-1">
                  <Slider
                    min={40}
                    max={150}
                    step={1}
                    value={[bodyWeight]}
                    onValueChange={(value) => setBodyWeight(value[0])}
                    className="w-full cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
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
                    />
                    <span className="text-xs text-muted-foreground">cm</span>
                  </div>
                </div>
                <div className="px-1">
                  <Slider
                    min={140}
                    max={220}
                    step={1}
                    value={[height]}
                    onValueChange={(value) => setHeight(value[0])}
                    className="w-full cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
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
                    />
                    <span className="text-xs text-muted-foreground">years</span>
                  </div>
                </div>
                <div className="px-1">
                  <Slider
                    min={15}
                    max={80}
                    step={1}
                    value={[age]}
                    onValueChange={(value) => setAge(value[0])}
                    className="w-full cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
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
                    />
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                </div>
                <div className="px-1">
                  <Slider
                    min={10}
                    max={200}
                    step={1}
                    value={[skeletalMuscleMass]}
                    onValueChange={(value) => setSkeletalMuscleMass(value[0])}
                    className="w-full cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
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
                    />
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                </div>
                <div className="px-1">
                  <Slider
                    min={2}
                    max={200}
                    step={1}
                    value={[bodyFatMass]}
                    onValueChange={(value) => setBodyFatMass(value[0])}
                    className="w-full cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
                    <span>2kg</span>
                    <span>200kg</span>
                  </div>
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="w-full h-10 bg-background border-border hover:bg-accent hover:text-accent-foreground transition-colors">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectItem value="male" className="cursor-pointer">
                      <div className="flex items-center justify-center space-x-2">
                        <UserCheck className="h-4 w-4" />
                        <span>Male</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="female" className="cursor-pointer">
                      <div className="flex items-center justify-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>Female</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Experience Level */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Experience Level</Label>
                <Select value={experience} onValueChange={setExperience}>
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
      )}
    </div>
  )
}

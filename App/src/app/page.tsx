'use client'

import { useState, useEffect, useCallback } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { WebBodyHighlighter } from "@/components/web-body-highlighter"
import { 
  loadAllExerciseData,
  validateExerciseData
} from '@/lib/exerciseLoader'
import { Target } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AuthCallbackHandler } from "@/auth/AuthCallbackHandler"
import { ThemeToggle } from '@/components/theme-toggle'

interface MuscleContribution {
  name: string
  percentage: number
  involvement: number
}

interface Exercise {
  id: string
  name: string
  description: string
  muscleInvolvement: { [muscleName: string]: number }
  baseWeightFactor: number // multiplier for base calculation
}

// Experience level mappings (moved outside component to avoid dependency issues)
const experienceFactors = {
  cat1: { factor: 0.6, label: 'Cat I (Beginner, 0-6 months)' },
  cat2: { factor: 0.7, label: 'Cat II (Novice, 6-12 months)' },
  cat3: { factor: 0.8, label: 'Cat III (Intermediate, 1-2 years)' },
  cat4: { factor: 0.9, label: 'Cat IV (Advanced, 3-4 years)' },
  cat5: { factor: 1.0, label: 'Cat V (Elite, 5+ years)' },
}

// Function to calculate muscle group contributions from involvement ratings
const calculateMuscleContributions = (exercise: Exercise): MuscleContribution[] => {
  const totalInvolvement = Object.values(exercise.muscleInvolvement).reduce((sum, val) => sum + val, 0)
  
  return Object.entries(exercise.muscleInvolvement)
    .filter(([, involvement]) => involvement > 0)
    .map(([name, involvement]) => ({
      name,
      involvement,
      percentage: (involvement / totalInvolvement) * 100
    }))
    .sort((a, b) => b.percentage - a.percentage)
}

export default function HomePage() {
  // User input states
  const [bodyWeight, setBodyWeight] = useState<number>(70)
  const [height, setHeight] = useState<number>(175)
  const [age, setAge] = useState<number>(25)
  const [gender, setGender] = useState<string>('male')
  const [experience, setExperience] = useState<string>('cat3')
  const [skeletalMuscleMass, setSkeletalMuscleMass] = useState<number>(30)
  const [bodyFatMass, setBodyFatMass] = useState<number>(20)
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('')
  

  // Exercise data states
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoadingExercises, setIsLoadingExercises] = useState<boolean>(false)
  const [exerciseLoadError, setExerciseLoadError] = useState<string | null>(null)

  // Calculated results
  const [idealWeight, setIdealWeight] = useState<number>(0)
  const [muscleGroups, setMuscleGroups] = useState<MuscleContribution[]>([])

  // Adjustment controls
  const [adjustmentPercent, setAdjustmentPercent] = useState<number>(0)
  const [stepPercent, setStepPercent] = useState<number>(10)


  // Get current exercise
  const currentExercise = exercises.find(ex => ex.id === selectedExerciseId) || exercises[0]

  // Update calculation whenever inputs change
  useEffect(() => {
    if (!currentExercise) return
    
    const G = gender === 'male' ? 1.0 : 0.9
    const A = age <= 30 ? 1.0 : 1 - 0.01 * (age - 30)
    const E = experienceFactors[experience as keyof typeof experienceFactors].factor

    // Height factor based on deviation from reference height (h0)
    const averageHeight = gender === 'male' ? 175 : 162 // h0 (cm)
    const c = 0.0025 // height influence per cm
    const Hraw = 1 - c * (height - averageHeight)
    const H = Math.max(0.85, Math.min(1.15, Hraw))

    // Fat mass factor based on body fat fraction
    const w = bodyWeight
    const m = Math.max(0, skeletalMuscleMass)
    const f = Math.min(Math.max(0, bodyFatMass), Math.max(0.0001, w))
    const p = w > 0 ? f / w : 0 // fraction [0-1]
    const fatInfluence = 0.5 // sensitivity of strength to body fat fraction
    const Fraw = 1 - fatInfluence * p
    const F = Math.max(0.7, Math.min(1.1, Fraw))

    // Ideal weight calculation using SMM as base mass and including exercise factor
    const calculatedWeight = m * G * A * E * F * H * (currentExercise.baseWeightFactor || 1)
    setIdealWeight(calculatedWeight)
  }, [bodyWeight, skeletalMuscleMass, bodyFatMass, height, age, gender, experience, currentExercise])

  // Function to load exercises from local JSON files
  const loadExternalExercises = useCallback(async () => {
    setIsLoadingExercises(true)
    setExerciseLoadError(null)

    try {
      // Load from local JSON files
      const externalExercises = await loadAllExerciseData()
      const validatedExercises = validateExerciseData(externalExercises)
      
      if (validatedExercises.length > 0) {
        setExercises(validatedExercises)
        // Set the first exercise as selected if none is selected
        if (!selectedExerciseId && validatedExercises[0]) {
          setSelectedExerciseId(validatedExercises[0].id)
        }
        console.log(`Loaded ${validatedExercises.length} exercises from local JSON files`)
      }
    } catch (error) {
      console.warn('Failed to load from local files:', error)
      setExerciseLoadError('Could not load exercises from local files. Please check that the JSON files are present.')
    } finally {
      setIsLoadingExercises(false)
    }
  }, [selectedExerciseId])

  // Load external exercise data on component mount
  useEffect(() => {
    loadExternalExercises()
  }, [loadExternalExercises])



  // Update muscle groups when exercise changes
  useEffect(() => {
    if (!currentExercise) return
    
    const contributions = calculateMuscleContributions(currentExercise)
    setMuscleGroups(contributions)
  }, [currentExercise])

  return (
    <AuthCallbackHandler>
      <SidebarProvider>
        <AppSidebar
          bodyWeight={bodyWeight}
          setBodyWeight={setBodyWeight}
          height={height}
          setHeight={setHeight}
          age={age}
          setAge={setAge}
          gender={gender}
          setGender={setGender}
          experience={experience}
          setExperience={setExperience}
          skeletalMuscleMass={skeletalMuscleMass}
          setSkeletalMuscleMass={setSkeletalMuscleMass}
          bodyFatMass={bodyFatMass}
          setBodyFatMass={setBodyFatMass}
          selectedExerciseId={selectedExerciseId}
          setSelectedExerciseId={setSelectedExerciseId}
          exercises={exercises}
          isLoadingExercises={isLoadingExercises}
          exerciseLoadError={exerciseLoadError}
          experienceFactors={experienceFactors}
        />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {currentExercise ? currentExercise.name : 'Fitness Calculator'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            {/* Main card and factor cards side-by-side on large screens */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 items-stretch">
              <Card className="@container/card border-2 border-primary/20 bg-gradient-to-t from-primary/5 to-card shadow-lg h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-start gap-3">
                    <div className="flex items-center space-x-2">
                      <Target className="h-6 w-6 text-primary" />
                      <CardTitle className="text-2xl @[250px]/card:text-3xl">Ideal Weight Calculation</CardTitle>
                    </div>
                  </div>
                  <CardDescription className="text-base">
                    {currentExercise ? `Your personalized ${currentExercise.name.toLowerCase()} recommendation` : 'Select an exercise to see recommendations'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 @[250px]/card:p-5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-5xl font-bold text-primary leading-tight tabular-nums">
                          {(idealWeight * (1 + adjustmentPercent / 100)).toFixed(2)} kg
                        </div>
                        <Label className="inline-flex items-center gap-1 text-sm @[250px]/card:text-base text-foreground border border-border rounded-md px-2.5 py-1 bg-background">
                          {adjustmentPercent > 0 ? `+${adjustmentPercent}` : adjustmentPercent}%
                        </Label>
                      </div>
                      <div className="text-base @[250px]/card:text-lg text-muted-foreground">
                        {currentExercise ? `Ideal ${currentExercise.name} Weight` : 'Ideal Weight'}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Step</span>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            inputMode="decimal"
                            className="w-20"
                            value={Number.isNaN(stepPercent) ? '' : stepPercent}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value)
                              if (Number.isNaN(value)) {
                                setStepPercent(0)
                              } else {
                                setStepPercent(Math.max(0, Math.min(100, value)))
                              }
                            }}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => setAdjustmentPercent((prev) => prev - (Number.isFinite(stepPercent) ? stepPercent : 0))}
                        >
                          -{Number.isFinite(stepPercent) ? stepPercent : 0}%
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setAdjustmentPercent((prev) => prev + (Number.isFinite(stepPercent) ? stepPercent : 0))}
                        >
                          +{Number.isFinite(stepPercent) ? stepPercent : 0}%
                        </Button>
                      </div>
                    </div>
                    {currentExercise && (
                      <div className="mt-3 p-3 bg-muted/60 rounded-md max-w-2xl md:max-w-3xl lg:max-w-4xl">
                        <p className="text-xs text-muted-foreground/90 line-clamp-3 md:line-clamp-none">
                          {currentExercise.description}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <div className="h-full overflow-auto">
                <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-3 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 auto-rows-[minmax(0,1fr)]">
                  <Card className="@container/card" data-slot="card">
                    <CardContent className="p-3 text-center h-24">
                      <CardDescription className="text-xs">Body Weight</CardDescription>
                      <CardTitle className="text-2xl @[250px]/card:text-3xl font-semibold tabular-nums">{bodyWeight}</CardTitle>
                      <div className="text-xs text-muted-foreground">kg</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="@container/card" data-slot="card">
                    <CardContent className="p-3 text-center h-24">
                      <CardDescription className="text-xs">SMM (Base)</CardDescription>
                      <CardTitle className="text-2xl @[250px]/card:text-3xl font-semibold tabular-nums">{skeletalMuscleMass}</CardTitle>
                      <div className="text-xs text-muted-foreground">kg</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="@container/card" data-slot="card">
                    <CardContent className="p-3 text-center h-3">
                      <CardDescription className="text-xs">Gender</CardDescription>
                      <CardTitle className="text-2xl @[250px]/card:text-3xl font-semibold">{gender === 'male' ? 'Male' : 'Female'}</CardTitle>
                      <div className="text-xs text-muted-foreground">G = {(gender === 'male' ? 1.0 : 0.9).toFixed(2)}×</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="@container/card" data-slot="card">
                    <CardContent className="p-3 text-center h-24">
                      <CardDescription className="text-xs">Age</CardDescription>
                      <CardTitle className="text-2xl @[250px]/card:text-3xl font-semibold tabular-nums">{age} yrs</CardTitle>
                      <div className="text-xs text-muted-foreground">A = {(age <= 30 ? 1.0 : 1 - 0.01 * (age - 30)).toFixed(2)}×</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="@container/card" data-slot="card">
                    <CardContent className="p-3 text-center h-24">
                      <CardDescription className="text-xs">Experience</CardDescription>
                      <CardTitle className="text-2xl @[250px]/card:text-3xl font-semibold">
                        {(() => {
                          const label = experienceFactors[experience as keyof typeof experienceFactors].label
                          const match = label.match(/\(([^)]+)\)/)
                          const inside = match ? match[1] : ''
                          const parts = inside.split(',').map(s => s.trim()).filter(Boolean)
                          return parts.length ? parts[parts.length - 1] : label
                        })()}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground">Cat {experience.slice(-1)} • E = {experienceFactors[experience as keyof typeof experienceFactors].factor.toFixed(2)}×</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="@container/card" data-slot="card">
                    <CardContent className="p-3 text-center h-24">
                      <CardDescription className="text-xs">Height</CardDescription>
                      <CardTitle className="text-2xl @[250px]/card:text-3xl font-semibold tabular-nums">{height} cm</CardTitle>
                      <div className="text-xs text-muted-foreground">H = {(() => {
                        const averageHeight = gender === 'male' ? 175 : 162
                        const c = 0.0025
                        const H = Math.max(0.85, Math.min(1.15, 1 - c * (height - averageHeight)))
                        return H.toFixed(3)
                      })()}×</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="@container/card" data-slot="card">
                    <CardContent className="p-3 text-center h-24">
                      <CardDescription className="text-xs">Body Fat</CardDescription>
                      <CardTitle className="text-2xl @[250px]/card:text-3xl font-semibold tabular-nums">{bodyFatMass} kg</CardTitle>
                      <div className="text-xs text-muted-foreground">F = {(() => {
                        const w = bodyWeight
                        const f = Math.min(Math.max(0, bodyFatMass), Math.max(0.0001, w))
                        const p = w > 0 ? f / w : 0
                        const fatInfluence = 0.5
                        const F = Math.max(0.7, Math.min(1.1, 1 - fatInfluence * p))
                        return F.toFixed(3)
                      })()}×</div>
                    </CardContent>
                  </Card>

                  <Card className="@container/card" data-slot="card">
                    <CardContent className="p-3 text-center h-24">
                      <CardDescription className="text-xs">Exercise</CardDescription>
                      <CardTitle className="text-2xl @[250px]/card:text-3xl font-semibold">{currentExercise?.name || '—'}</CardTitle>
                      <div className="text-xs text-muted-foreground">Factor = {(currentExercise?.baseWeightFactor ?? 0).toFixed(2)}×</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-6">
              {/* Web Body Highlighter */}
              {currentExercise && (
                <WebBodyHighlighter
                  muscleGroups={muscleGroups}
                  exerciseName={currentExercise.name}
                />
              )}
            </div>

            {/* Formula Card */}
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <div className="text-center md:text-left">
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Formula:</strong> Ideal Weight = SMM × Gender × Age × Experience × Fat Factor × Height × Exercise Factor
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Height factor H = 1 − c × (h − h₀). Fat factor F = 1 − k × (BFM / BW). SMM is Skeletal Muscle Mass. Exercise factor scales by movement difficulty.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthCallbackHandler>
  )
}

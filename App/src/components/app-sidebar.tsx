import { useEffect, useState } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { LoginForm } from "@/components/login-form"
import { supabase } from '@/lib/supabaseClient'

import { Search, User, Dumbbell, Activity, ChevronDown, UserCheck, Users } from "lucide-react"

interface Exercise {
  id: string
  name: string
  description: string
  muscleInvolvement: { [muscleName: string]: number }
  baseWeightFactor: number
}

interface AppSidebarProps {
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
  
  // Exercise data
  exercises: Exercise[]
  isLoadingExercises: boolean
  exerciseLoadError: string | null
  
  // Experience factors
  experienceFactors: { [key: string]: { factor: number; label: string } }
}

export function AppSidebar({
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
  exercises,
  isLoadingExercises,
  exerciseLoadError,
  experienceFactors,
}: AppSidebarProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      setUserEmail(data.user?.email ?? null)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async () => {
      const { data } = await supabase.auth.getUser()
      setUserEmail(data.user?.email ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])
  const [searchQuery, setSearchQuery] = useState("")
  const [bodyWeightInput, setBodyWeightInput] = useState(String(bodyWeight))
  const [heightInput, setHeightInput] = useState(String(height))
  const [ageInput, setAgeInput] = useState(String(age))
  const [skeletalMuscleMassInput, setSkeletalMuscleMassInput] = useState(String(skeletalMuscleMass))
  const [bodyFatMassInput, setBodyFatMassInput] = useState(String(bodyFatMass))
  const [isLoginOpen, setIsLoginOpen] = useState(false)

  useEffect(() => { setBodyWeightInput(String(bodyWeight)) }, [bodyWeight])
  useEffect(() => { setHeightInput(String(height)) }, [height])
  useEffect(() => { setAgeInput(String(age)) }, [age])
  useEffect(() => { setSkeletalMuscleMassInput(String(skeletalMuscleMass)) }, [skeletalMuscleMass])
  useEffect(() => { setBodyFatMassInput(String(bodyFatMass)) }, [bodyFatMass])

  // Filter exercises based on search query
  const filteredExercises = exercises.filter(exercise =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get current exercise name for display
  const currentExercise = exercises.find(ex => ex.id === selectedExerciseId)
  const currentExerciseName = currentExercise?.name || "Select Exercise"

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Dumbbell className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Stronk</h2>
            <p className="text-sm text-muted-foreground">Calculator</p>
          </div>
        </div>
        {userEmail && (
          <div className="text-xs text-muted-foreground truncate">Signed in as {userEmail}</div>
        )}

      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center">
            <Activity className="mr-2 h-4 w-4" />
            Exercises
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between h-10 bg-background border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                    disabled={isLoadingExercises}
                  >
                    <span className="truncate font-medium">
                      {isLoadingExercises ? "Loading exercises..." : currentExerciseName}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50 transition-transform" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-[280px] max-h-[350px] overflow-y-auto"
                  align="start"
                  side="bottom"
                  sideOffset={4}
                  alignOffset={0}
                >
                  <DropdownMenuLabel className="flex items-center">
                    <Activity className="mr-2 h-4 w-4" />
                    Select Exercise
                  </DropdownMenuLabel>
                  <div className="px-3 py-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search exercises..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 bg-background border-border hover:border-border/80 focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {filteredExercises.length > 0 ? (
                    filteredExercises.map((exercise) => (
                      <DropdownMenuItem
                        key={exercise.id}
                        onClick={() => setSelectedExerciseId(exercise.id)}
                        className="cursor-pointer py-3 hover:bg-accent/50"
                      >
                        <div className="flex flex-col w-full">
                          <span className="font-medium text-sm">{exercise.name}</span>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-muted-foreground">
                              Weight Factor
                            </span>
                            <span className="text-xs font-semibold text-primary tabular-nums">
                              {exercise.baseWeightFactor}
                            </span>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled className="text-center py-4">
                      <div className="flex flex-col items-center">
                        <span className="text-sm text-muted-foreground">
                          {searchQuery ? "No exercises found" : "No exercises available"}
                        </span>
                        {searchQuery && (
                          <span className="text-xs text-muted-foreground mt-1">
                            Try adjusting your search
                          </span>
                        )}
                      </div>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {exerciseLoadError && (
                <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 p-3 rounded-lg mt-3 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start space-x-2">
                    <span className="text-amber-600 dark:text-amber-400">⚠</span>
                    <span>{exerciseLoadError}</span>
                  </div>
                </div>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            Personal Details
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-2 space-y-5">
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
                          <span className="font-medium">Category {key.slice(-1)}</span>
                          <span className="text-xs text-muted-foreground">
                            {value.label.split('(')[1]?.replace(')', '') || value.label}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {userEmail ? (
          <Button className="w-full" variant="outline" onClick={async () => { await supabase.auth.signOut(); }}>
            Logout
          </Button>
        ) : (
          <Button className="w-full" onClick={() => setIsLoginOpen(true)}>
            Login
          </Button>
        )}
      </SidebarFooter>

      <Sheet open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <SheetContent side="bottom" animation="fade" className="p-0 inset-0 w-screen sm:h-dvh h-svh max-w-none rounded-none border-0">
          <div className="bg-muted flex min-h-full flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
              <LoginForm />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </Sidebar>
  )
}

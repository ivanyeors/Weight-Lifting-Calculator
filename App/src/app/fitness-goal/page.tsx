"use client"

import { useEffect, useMemo, useState } from 'react'
import { useSelectedUser } from '@/hooks/use-selected-user'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Target, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  Dumbbell, 
  Scale,
  Clock,
  Calculator,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Plus,
  Target as TargetIcon,
  Settings
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'



import { PlanSidebar } from './plan-sidebar'
import { ParticlesCard } from './particles/ParticlesCard'
import { CreatePlanDrawer } from './plan-create-drawer'
import { usePlans } from './plan-store'
import { fetchPlans } from './plan-api'
import type { Plan } from './plan-types'

// TypeScript interfaces for data structures
interface FitnessGoal {
  id: string
  userId: string
  goalType: 'lose_weight' | 'gain_weight' | 'build_muscle'
  bodyPhysique: 'lean' | 'lean_muscular' | 'muscular' | 'extreme_muscular'
  currentWeight: number
  targetWeight: number
  startDate: Date
  endDate?: Date
  timeFrame?: number // in days
  dailyCalorieDeficit?: number
  dailyCalorieSurplus?: number
  proteinTarget: number
  carbsTarget: number
  fatTarget: number
  createdAt: Date
  updatedAt: Date
}

interface UserProfile {
  id: string
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  height: number // in cm
  weight: number // in kg
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'
  bmr: number
  tdee: number
}

// Goal type options
const goalTypes = [
  { value: 'lose_weight', label: 'Lose Weight', icon: TrendingDown, color: 'text-red-500' },
  { value: 'gain_weight', label: 'Gain Weight', icon: TrendingUp, color: 'text-green-500' },
  { value: 'build_muscle', label: 'Build Muscle', icon: Dumbbell, color: 'text-blue-500' }
]

// Body physique options
const bodyPhysiques = [
  { value: 'lean', label: 'Lean', description: 'Low body fat, minimal muscle mass' },
  { value: 'lean_muscular', label: 'Lean Muscular', description: 'Low body fat, moderate muscle mass' },
  { value: 'muscular', label: 'Muscular', description: 'Moderate body fat, high muscle mass' },
  { value: 'extreme_muscular', label: 'Extreme Muscular', description: 'Higher body fat, maximum muscle mass' }
]

// Activity level multipliers for TDEE calculation
const activityMultipliers = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9
}

// Chart colors
const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#64748b',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#94a3b8'
}

export default function FitnessGoalPage() {
  const { user } = useSelectedUser()

  // Plans integration
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    try {
      const stored = typeof window !== 'undefined' ? (localStorage.getItem('fitspo:selected_user_id') || '') : ''
      return stored || (user?.id || '')
    } catch {
      return user?.id || ''
    }
  })
  const { plans: localPlans, update } = usePlans(selectedUserId || null)
  const [plans, setPlans] = useState(localPlans)
  useEffect(() => { setPlans(localPlans) }, [localPlans])
  useEffect(() => {
    const load = async () => {
      try {
        if (!selectedUserId) return
        const dbPlans = await fetchPlans(selectedUserId)
        if (dbPlans && dbPlans.length > 0) setPlans(dbPlans)
      } catch {/* ignore */}
    }
    void load()
  }, [selectedUserId])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const activePlan = useMemo(() => plans.find(p => p.id === selectedPlanId) || null, [plans, selectedPlanId])

  useEffect(() => {
    const onChange = () => {
      try {
        const s = localStorage.getItem('fitspo:selected_user_id') || ''
        setSelectedUserId(s)
        setSelectedPlanId(null)
      } catch (e) {
        // noop
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('fitspo:selected_user_changed', onChange)
      return () => window.removeEventListener('fitspo:selected_user_changed', onChange)
    }
  }, [])

  // Fitness goal calculators (existing)
  const [selectedGoal, setSelectedGoal] = useState<string>('')
  const selectedPhysique = useMemo(() => activePlan?.config?.exercise?.physique || '', [activePlan])
  const [currentWeight, setCurrentWeight] = useState<number>(0)
  const [targetWeight, setTargetWeight] = useState<number>(0)
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>()
  const [showCalendar, setShowCalendar] = useState(false)
  const [calculatedPlan, setCalculatedPlan] = useState<FitnessGoal | null>(null)

  // Prefill current/target weight from the selected user's profile
  useEffect(() => {
    if (user?.inputs?.bodyWeight != null) {
      const w = Number(user.inputs.bodyWeight)
      setCurrentWeight(w)
      if (!targetWeight) setTargetWeight(w)
    }
  }, [user])

  // Calculate BMR using Mifflin-St Jeor Equation
  const calculateBMR = (weight: number, height: number, age: number, gender: string): number => {
    if (gender === 'male') {
      return 10 * weight + 6.25 * height - 5 * age + 5
    } else {
      return 10 * weight + 6.25 * height - 5 * age - 161
    }
  }

  // Calculate TDEE
  const calculateTDEE = (bmr: number, activityLevel: string): number => {
    return bmr * activityMultipliers[activityLevel as keyof typeof activityMultipliers]
  }

  // Calculate daily calorie needs based on goal
  const calculateDailyCalories = (tdee: number, goalType: string, timeFrame: number, weightDifference: number): number => {
    const totalCalorieChange = weightDifference * 7700 // 1 kg = 7700 calories
    const dailyCalorieChange = totalCalorieChange / timeFrame

    if (goalType === 'lose_weight') {
      return tdee - dailyCalorieChange
    } else if (goalType === 'gain_weight' || goalType === 'build_muscle') {
      return tdee + dailyCalorieChange
    }
    return tdee
  }

  // Calculate macronutrients
  const calculateMacros = (dailyCalories: number, goalType: string): { protein: number; carbs: number; fat: number } => {
    let proteinRatio: number
    let fatRatio: number
    let carbsRatio: number

    if (goalType === 'build_muscle') {
      proteinRatio = 0.3 // 30% protein
      fatRatio = 0.25 // 25% fat
      carbsRatio = 0.45 // 45% carbs
    } else if (goalType === 'lose_weight') {
      proteinRatio = 0.35 // 35% protein
      fatRatio = 0.3 // 30% fat
      carbsRatio = 0.35 // 35% carbs
    } else {
      proteinRatio = 0.25 // 25% protein
      fatRatio = 0.25 // 25% fat
      carbsRatio = 0.5 // 50% carbs
    }

    return {
      protein: Math.round((dailyCalories * proteinRatio) / 4), // 4 calories per gram
      carbs: Math.round((dailyCalories * carbsRatio) / 4), // 4 calories per gram
      fat: Math.round((dailyCalories * fatRatio) / 9) // 9 calories per gram
    }
  }

  const generatePlan = () => {
    if (!selectedGoal || !selectedPhysique || !currentWeight || !targetWeight || !endDate) {
      return
    }

    // Mock user profile - in real app, this would come from database
    const mockUser: UserProfile = {
      id: user?.id || '1',
      name: user?.name || 'User',
      age: 30,
      gender: 'male',
      height: 175,
      weight: currentWeight,
      activityLevel: 'moderately_active',
      bmr: 0,
      tdee: 0
    }

    // Calculate BMR and TDEE
    const bmr = calculateBMR(mockUser.weight, mockUser.height, mockUser.age, mockUser.gender)
    const tdee = calculateTDEE(bmr, mockUser.activityLevel)

    // Calculate time frame
    const timeFrame = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const weightDifference = Math.abs(targetWeight - currentWeight)

    // Calculate daily calories
    const dailyCalories = calculateDailyCalories(tdee, selectedGoal, timeFrame, weightDifference)

    // Calculate macronutrients
    const macros = calculateMacros(dailyCalories, selectedGoal)

    // Create fitness goal plan
    const plan: FitnessGoal = {
      id: `goal_${Date.now()}`,
      userId: mockUser.id,
      goalType: selectedGoal as FitnessGoal['goalType'],
      bodyPhysique: selectedPhysique as FitnessGoal['bodyPhysique'],
      currentWeight,
      targetWeight,
      startDate,
      endDate,
      timeFrame,
      dailyCalorieDeficit: selectedGoal === 'lose_weight' ? tdee - dailyCalories : undefined,
      dailyCalorieSurplus: selectedGoal === 'gain_weight' || selectedGoal === 'build_muscle' ? dailyCalories - tdee : undefined,
      proteinTarget: macros.protein,
      carbsTarget: macros.carbs,
      fatTarget: macros.fat,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    setCalculatedPlan(plan)
  }

  const getGoalIcon = (goalType: string) => {
    const goal = goalTypes.find(g => g.value === goalType)
    return goal ? goal.icon : Target
  }

  const getPhysiqueLabel = (physique: string) => {
    const physiqueOption = bodyPhysiques.find(p => p.value === physique)
    return physiqueOption ? physiqueOption.label : physique
  }



  return (
    <div className="flex h-full">
      <PlanSidebar
        selectedUserId={selectedUserId}
        onSelectUser={(id) => { setSelectedUserId(id); setSelectedPlanId(null) }}
        onCreatePlan={() => setDrawerOpen(true)}
        plans={plans}
        selectedPlanId={selectedPlanId}
        onSelectPlan={setSelectedPlanId}
      />

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">Fitness Goals</div>
          </div>
          {activePlan ? null : (
            <Button onClick={() => setDrawerOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          )}
        </div>

        <div className="p-4 space-y-6">
          {/* Top: Particles visualization + metrics */}
          <ParticlesCard plan={activePlan} />

          {activePlan && (
            <div className="flex gap-2">
              <Button variant="default" onClick={() => update(activePlan.id, { status: 'active' })}>Start plan</Button>
              <Button variant="secondary" onClick={() => update(activePlan.id, { status: 'paused' })}>Pause plan</Button>
              <Button variant="outline" onClick={() => update(activePlan.id, { status: 'completed' })}>Stop plan</Button>
            </div>
          )}
          {/* Pillar metrics 1x4 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Food</CardTitle>
                <CardDescription>Daily status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {(() => {
                    try {
                      const day = new Date().toISOString().slice(0,10)
                      const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:food_status_by_day') : null
                      const map = raw ? JSON.parse(raw) as Record<string, 'pending'|'complete'|'missed'> : {}
                      const s = map[day] || 'pending'
                      return s === 'complete' ? 'Complete' : s === 'missed' ? 'Missed' : 'Pending'
                    } catch { return 'Pending' }
                  })()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Water</CardTitle>
                <CardDescription>Today’s completion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {(() => {
                    try {
                      const day = new Date().toISOString().slice(0,10)
                      const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:water_status_by_day') : null
                      const store = raw ? JSON.parse(raw) as Record<string, Record<string, 'pending'|'complete'|'missed'>> : {}
                      const dayMap = store[day] || {}
                      const vals = Object.values(dayMap)
                      if (vals.length === 0) return '0%'
                      const comp = vals.filter(v => v === 'complete').length
                      const pct = Math.round((comp / vals.length) * 100)
                      return `${pct}%`
                    } catch { return '0%' }
                  })()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sleep</CardTitle>
                <CardDescription>Planned hours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {(() => {
                    try {
                      const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:plans') : null
                      if (!raw) return '—'
                      const userId = typeof window !== 'undefined' ? (localStorage.getItem('fitspo:selected_user_id') || '') : ''
                      const all = JSON.parse(raw) as Record<string, Array<{ config?: { sleep?: { startTime?: string; endTime?: string } } }>>
                      const plan = (all[userId] || [])[0]
                      const s = plan?.config?.sleep?.startTime || '23:00'
                      const e = plan?.config?.sleep?.endTime || '07:00'
                      const [sh, sm] = s.split(':').map(Number)
                      const [eh, em] = e.split(':').map(Number)
                      let hrs = (eh + (eh < sh ? 24 : 0)) - sh + (em - sm)/60
                      if (!Number.isFinite(hrs)) hrs = 8
                      return `${Math.round(hrs*10)/10}h`
                    } catch { return '—' }
                  })()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Exercise</CardTitle>
                <CardDescription>Sessions today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {(() => {
                    try {
                      const today = new Date().toISOString().slice(0,10)
                      const raw = typeof window !== 'undefined' ? localStorage.getItem('fitspo:cached_events') : null
                      if (!raw) return 0
                      const events = JSON.parse(raw) as Array<{ source?: string; start?: string }>
                      const count = events.filter(e => e.source === 'platform' && e.start?.startsWith(today)).length
                      return count
                    } catch { return 0 }
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Dashboard and settings removed */}
          </div>

        <CreatePlanDrawer open={drawerOpen} onOpenChange={setDrawerOpen} userId={selectedUserId} />
      </div>
    </div>
  )
}

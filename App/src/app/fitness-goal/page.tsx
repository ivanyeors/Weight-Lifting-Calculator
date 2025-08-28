"use client"

import { useState } from 'react'
import { useSelectedUser } from '@/hooks/use-selected-user'
import { UserSwitcher } from '@/components/user-switcher'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  User,
  Activity
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

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

export default function FitnessGoalPage() {
  const { user } = useSelectedUser()
  const [selectedGoal, setSelectedGoal] = useState<string>('')
  const [selectedPhysique, setSelectedPhysique] = useState<string>('')
  const [currentWeight, setCurrentWeight] = useState<number>(0)
  const [targetWeight, setTargetWeight] = useState<number>(0)
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>()
  const [showCalendar, setShowCalendar] = useState(false)
  const [calculatedPlan, setCalculatedPlan] = useState<FitnessGoal | null>(null)

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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fitness Goal Planner</h1>
          <p className="text-muted-foreground">Set your fitness goals and get a personalized plan</p>
        </div>
        <div className="max-w-sm">
          <UserSwitcher />
        </div>
      </div>

      {user ? (
        <p className="text-muted-foreground">Using profile: <span className="font-medium">{user.name}</span></p>
      ) : (
        <p className="text-muted-foreground">Select a user in Users to personalize.</p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Goal Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Select Your Goal
            </CardTitle>
            <CardDescription>Choose what you want to achieve</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {goalTypes.map((goal) => {
                const Icon = goal.icon
                return (
                  <Button
                    key={goal.value}
                    variant={selectedGoal === goal.value ? "default" : "outline"}
                    className="justify-start h-auto p-4"
                    onClick={() => setSelectedGoal(goal.value)}
                  >
                    <Icon className={cn("h-5 w-5 mr-3", goal.color)} />
                    <div className="text-left">
                      <div className="font-medium">{goal.label}</div>
                    </div>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Body Physique Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Target Body Physique
            </CardTitle>
            <CardDescription>What type of physique are you aiming for?</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedPhysique} onValueChange={setSelectedPhysique}>
              <SelectTrigger>
                <SelectValue placeholder="Select body physique" />
              </SelectTrigger>
              <SelectContent>
                {bodyPhysiques.map((physique) => (
                  <SelectItem key={physique.value} value={physique.value}>
                    <div>
                      <div className="font-medium">{physique.label}</div>
                      <div className="text-sm text-muted-foreground">{physique.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Weight Inputs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Current & Target Weight
            </CardTitle>
            <CardDescription>Enter your current and target weights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current-weight">Current Weight (kg)</Label>
                <Input
                  id="current-weight"
                  type="number"
                  placeholder="70"
                  value={currentWeight || ''}
                  onChange={(e) => setCurrentWeight(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-weight">Target Weight (kg)</Label>
                <Input
                  id="target-weight"
                  type="number"
                  placeholder="65"
                  value={targetWeight || ''}
                  onChange={(e) => setTargetWeight(Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Frame Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Time Frame
            </CardTitle>
            <CardDescription>Set your goal timeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date || new Date())
                      setShowCalendar(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    disabled={(date) => date < startDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate Plan Button */}
      <div className="flex justify-center">
        <Button 
          size="lg" 
          onClick={generatePlan}
          disabled={!selectedGoal || !selectedPhysique || !currentWeight || !targetWeight || !endDate}
          className="px-8"
        >
          <Calculator className="mr-2 h-5 w-5" />
          Generate Fitness Plan
        </Button>
      </div>

      {/* Calculated Plan Display */}
      {calculatedPlan && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Your Personalized Fitness Plan
            </CardTitle>
            <CardDescription>
              Based on your {getGoalIcon(calculatedPlan.goalType).name} goal to {calculatedPlan.goalType.replace('_', ' ')} 
              and achieve a {getPhysiqueLabel(calculatedPlan.bodyPhysique)} physique
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Plan Summary */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {calculatedPlan.timeFrame}
                </div>
                <div className="text-sm text-muted-foreground">Days</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {Math.abs(calculatedPlan.targetWeight - calculatedPlan.currentWeight).toFixed(1)} kg
                </div>
                <div className="text-sm text-muted-foreground">
                  {calculatedPlan.goalType === 'lose_weight' ? 'To Lose' : 'To Gain'}
                </div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {calculatedPlan.dailyCalorieDeficit ? 
                    `${calculatedPlan.dailyCalorieDeficit.toFixed(0)} kcal` :
                    calculatedPlan.dailyCalorieSurplus ? 
                    `${calculatedPlan.dailyCalorieSurplus.toFixed(0)} kcal` : 
                    '0 kcal'
                  }
                </div>
                <div className="text-sm text-muted-foreground">
                  Daily {calculatedPlan.dailyCalorieDeficit ? 'Deficit' : 'Surplus'}
                </div>
              </div>
            </div>

            <Separator />

            {/* Macronutrients */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Daily Macronutrient Targets</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Protein</Label>
                    <Badge variant="secondary">{calculatedPlan.proteinTarget}g</Badge>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Carbohydrates</Label>
                    <Badge variant="secondary">{calculatedPlan.carbsTarget}g</Badge>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Fat</Label>
                    <Badge variant="secondary">{calculatedPlan.fatTarget}g</Badge>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Recommendations */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 mt-0.5 text-blue-500" />
                  <div>
                    <div className="font-medium">Timeline</div>
                    <div className="text-sm text-muted-foreground">
                      {format(calculatedPlan.startDate, "PPP")} to {calculatedPlan.endDate && format(calculatedPlan.endDate, "PPP")}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingDown className="h-5 w-5 mt-0.5 text-green-500" />
                  <div>
                    <div className="font-medium">Weekly Progress</div>
                    <div className="text-sm text-muted-foreground">
                      Aim to {calculatedPlan.goalType === 'lose_weight' ? 'lose' : 'gain'} {(Math.abs(calculatedPlan.targetWeight - calculatedPlan.currentWeight) / (calculatedPlan.timeFrame! / 7)).toFixed(2)} kg per week
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Dumbbell className="h-5 w-5 mt-0.5 text-purple-500" />
                  <div>
                    <div className="font-medium">Exercise Focus</div>
                    <div className="text-sm text-muted-foreground">
                      {calculatedPlan.goalType === 'build_muscle' ? 
                        'Focus on strength training 3-4 times per week with progressive overload' :
                        calculatedPlan.goalType === 'lose_weight' ?
                        'Combine cardio (3-4 times/week) with strength training (2-3 times/week)' :
                        'Balanced approach with strength training and moderate cardio'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { AnimatedBeam } from '@/components/ui/shadcn-io/animated-beam'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { FlickeringGrid } from '@/components/ui/shadcn-io/flickering-grid'
import { LoginForm } from '@/app/account/login-form'
import {
  CheckCircle,
  Circle,
  AlertCircle,
  ArrowRight,
  Users,
  Dumbbell,
  Calendar,
  ChefHat,
  Target,
  Settings,
  UserPlus,
  MapPin,
  FileText,
  CalendarDays,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { useSelectedUser } from '@/hooks/use-selected-user'

type StepStatus = 'pending' | 'completed' | 'in-progress' | 'disabled'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  status: StepStatus
  path?: string
  category: 'users' | 'exercises' | 'nutrition' | 'calendar' | 'goals'
  dependencies?: string[]
  isOptional?: boolean
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user: selectedUser } = useSelectedUser()
  const { isAuthenticated: isGoogleCalendarConnected } = useGoogleCalendar()

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session?.user)
      } catch (error) {
        console.error('Error checking auth status:', error)
        setIsAuthenticated(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user)
      if (session?.user && isLoginOpen) {
        setIsLoginOpen(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [isLoginOpen])

  // Refs for animated beam
  const containerRef = useRef<HTMLDivElement>(null)
  const usersRef = useRef<HTMLDivElement>(null)
  const exercisesRef = useRef<HTMLDivElement>(null)
  const nutritionRef = useRef<HTMLDivElement>(null)
  const goalsRef = useRef<HTMLDivElement>(null)

  const [steps, setSteps] = useState<OnboardingStep[]>([
    // Users section
    {
      id: 'user-profile',
      title: 'Create User Profile',
      description: 'Set up your personal profile with body measurements, goals, and preferences',
      icon: <UserPlus className="w-5 h-5" />,
      status: 'pending',
      path: '/plans/users',
      category: 'users'
    },

    // Exercises section
    {
      id: 'workout-space',
      title: 'Create Workout Space',
      description: 'Define your training environment and available equipment',
      icon: <MapPin className="w-5 h-5" />,
      status: 'pending',
      path: '/workout-spaces',
      category: 'exercises',
      dependencies: ['user-profile']
    },
    {
      id: 'workout-template',
      title: 'Create Workout Template',
      description: 'Design your exercise routines with sets, reps, and rest times',
      icon: <FileText className="w-5 h-5" />,
      status: 'pending',
      path: '/plans/workout-templates',
      category: 'exercises',
      dependencies: ['workout-space']
    },
    {
      id: 'google-calendar',
      title: 'Connect Google Calendar (Optional)',
      description: 'Sync your workouts with Google Calendar for better organization',
      icon: <CalendarDays className="w-5 h-5" />,
      status: 'pending',
      path: '/account?tab=calendar',
      category: 'exercises',
      isOptional: true
    },
    {
      id: 'workout-sessions',
      title: 'Schedule Workout Sessions',
      description: 'Create and manage your workout sessions in the calendar',
      icon: <Calendar className="w-5 h-5" />,
      status: 'pending',
      path: '/plans/workout-plans',
      category: 'exercises',
      dependencies: ['workout-template']
    },

    // Nutrition section
    {
      id: 'nutrition-recipes',
      title: 'Add Nutrition Recipes',
      description: 'Browse and add healthy recipes based on your dietary preferences',
      icon: <ChefHat className="w-5 h-5" />,
      status: 'pending',
      path: '/plans/nutrition',
      category: 'nutrition',
      dependencies: ['user-profile']
    },

    // Goals section
    {
      id: 'fitness-goals',
      title: 'Set Fitness Goals',
      description: 'Create personalized fitness plans with water, sleep, and exercise tracking',
      icon: <Target className="w-5 h-5" />,
      status: 'pending',
      path: '/fitness-goal',
      category: 'goals',
      dependencies: ['user-profile', 'workout-template']
    }
  ])

  const [usersCount, setUsersCount] = useState(0)
  const [spacesCount, setSpacesCount] = useState(0)
  const [templatesCount, setTemplatesCount] = useState(0)

  // State to track expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    users: true, // Start with users expanded by default
    exercises: false,
    nutrition: false,
    goals: false
  })

  // Track user-initiated overrides so auto logic doesn't fight the user
  const [sectionOpenOverrides, setSectionOpenOverrides] = useState<Record<string, boolean>>({})

  const handleSectionOpenChange = (category: string, open: boolean) => {
    setExpandedSections(prev => ({ ...prev, [category]: open }))
    setSectionOpenOverrides(prev => ({ ...prev, [category]: open }))
  }

  // Auto-manage section expansion based on completion status
  const updateSectionExpansion = useCallback((currentSteps: OnboardingStep[]) => {
    const categoryOrder = ['users', 'exercises', 'nutrition', 'goals']
    const newExpandedSections = { ...expandedSections }

    categoryOrder.forEach((category, index) => {
      // Respect user override for this category
      if (sectionOpenOverrides[category] !== undefined) {
        newExpandedSections[category] = sectionOpenOverrides[category]
        return
      }

      const categorySteps = currentSteps.filter(step => step.category === category)
      const totalSteps = categorySteps.filter(step => !step.isOptional).length
      const completedSteps = categorySteps.filter(step => step.status === 'completed' && !step.isOptional).length
      const hasPendingSteps = categorySteps.some(step => step.status === 'pending' || step.status === 'in-progress')

      // If section is fully completed, collapse it
      if (totalSteps > 0 && completedSteps >= totalSteps && !hasPendingSteps) {
        newExpandedSections[category] = false
      }
      // If section has pending/in-progress steps and previous section is completed, expand it
      else if (hasPendingSteps) {
        // Check if previous section is completed
        const prevCategory = categoryOrder[index - 1]
        const shouldExpand = index === 0 || // First section always expandable
          (prevCategory && (() => {
            const prevSteps = currentSteps.filter(step => step.category === prevCategory)
            const prevTotal = prevSteps.filter(step => !step.isOptional).length
            const prevCompleted = prevSteps.filter(step => step.status === 'completed' && !step.isOptional).length
            return prevTotal === 0 || prevCompleted >= prevTotal
          })())

        if (shouldExpand) {
          newExpandedSections[category] = true
        }
      }
    })

    // Update state if there are changes
    if (JSON.stringify(newExpandedSections) !== JSON.stringify(expandedSections)) {
      setExpandedSections(newExpandedSections)
    }
  }, [expandedSections, sectionOpenOverrides])


  // Check completion status for each step
  useEffect(() => {
    const checkStatuses = async () => {
      try {
        // For unauthenticated users, set everything to false
        if (!isAuthenticated) {
          setUsersCount(0)
          setSpacesCount(0)
          setTemplatesCount(0)

          setSteps(prev => prev.map((step: OnboardingStep) => {
            let status: StepStatus = 'pending'

            switch (step.id) {
              case 'user-profile':
                status = 'in-progress'
                break
              case 'workout-space':
                status = 'disabled'
                break
              case 'workout-template':
                status = 'disabled'
                break
              case 'google-calendar':
                status = 'pending'
                break
              case 'workout-sessions':
                status = 'disabled'
                break
              case 'nutrition-recipes':
                status = 'disabled'
                break
              case 'fitness-goals':
                status = 'pending'
                break
            }

            return { ...step, status }
          }))

          return
        }

        // Only query database for authenticated users
        // Check users
        const { data: users } = await supabase
          .from('managed_users')
          .select('id')
        const hasUsers = (users?.length || 0) > 0
        setUsersCount(users?.length || 0)

        // Check workout spaces
        const { data: spaces } = await supabase
          .from('workout_spaces')
          .select('id')
        const hasSpaces = (spaces?.length || 0) > 0
        setSpacesCount(spaces?.length || 0)

        // Check workout templates
        const { data: templates } = await supabase
          .from('workout_templates')
          .select('id')
        const hasTemplates = (templates?.length || 0) > 0
        setTemplatesCount(templates?.length || 0)

        // Check workout sessions
        const { data: sessions } = await supabase
          .from('workout_sessions')
          .select('id')
        const hasSessions = (sessions?.length || 0) > 0

        // Check nutrition page visits
        const nutritionVisited = typeof window !== 'undefined' ? localStorage.getItem('fitspo:nutrition_page_visited') === 'true' : false

        // Check if user has visited fitness-goal page
        const hasVisitedFitnessGoal = typeof window !== 'undefined' ? localStorage.getItem('fitspo:fitness_goal_visited') === 'true' : false

        // Update step statuses
        setSteps(prev => {
          const updatedSteps = prev.map((step: OnboardingStep) => {
            let status: StepStatus = 'pending'

            switch (step.id) {
              case 'user-profile':
                status = hasUsers ? 'completed' : 'in-progress'
                break
              case 'workout-space':
                status = hasUsers ? (hasSpaces ? 'completed' : 'in-progress') : 'disabled'
                break
              case 'workout-template':
                status = hasSpaces ? (hasTemplates ? 'completed' : 'in-progress') : 'disabled'
                break
              case 'google-calendar':
                status = isGoogleCalendarConnected ? 'completed' : 'pending'
                break
              case 'workout-sessions':
                status = hasTemplates ? (hasSessions ? 'completed' : 'in-progress') : 'disabled'
                break
              case 'nutrition-recipes':
                status = hasUsers ? (nutritionVisited ? 'completed' : 'in-progress') : 'disabled'
                break
              case 'fitness-goals':
                status = hasUsers ? (hasVisitedFitnessGoal ? 'completed' : 'in-progress') : 'disabled'
                break
            }

            return { ...step, status }
          })

          return updatedSteps
        })

      } catch (error) {
        console.error('Error checking onboarding status:', error)
      }
    }

    checkStatuses()

    // Listen for changes
    const handleChange = () => checkStatuses()
    const handleFitnessGoalVisited = () => {
      // Mark fitness goal as visited and update status
      localStorage.setItem('fitspo:fitness_goal_visited', 'true')
      handleChange()
    }

    window.addEventListener('fitspo:selected_user_changed', handleChange)
    window.addEventListener('storage', handleChange)
    window.addEventListener('fitspo:workout_session_created', handleChange)
    window.addEventListener('fitspo:nutrition_page_visited', handleChange)
    window.addEventListener('fitspo:fitness_goal_visited', handleFitnessGoalVisited)

    return () => {
      window.removeEventListener('fitspo:selected_user_changed', handleChange)
      window.removeEventListener('storage', handleChange)
      window.removeEventListener('fitspo:workout_session_created', handleChange)
      window.removeEventListener('fitspo:nutrition_page_visited', handleChange)
      window.removeEventListener('fitspo:fitness_goal_visited', handleFitnessGoalVisited)
    }
  }, [selectedUser, isGoogleCalendarConnected, isAuthenticated])

  // Auto-update section expansion when steps change
  useEffect(() => {
    updateSectionExpansion(steps)
  }, [steps, updateSectionExpansion])

  const getStatusIcon = (status: StepStatus, isOptional?: boolean) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'in-progress':
        return <AlertCircle className="w-5 h-5 text-primary" />
      case 'disabled':
        return <Circle className="w-5 h-5 text-muted-foreground" />
      default:
        return isOptional ? <Circle className="w-5 h-5 text-orange-500" /> : <Circle className="w-5 h-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: StepStatus, isOptional?: boolean) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">Completed</Badge>
      case 'in-progress':
        return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">In Progress</Badge>
      case 'disabled':
        return <Badge variant="secondary" className="text-muted-foreground">Waiting</Badge>
      default:
        return isOptional ?
          <Badge variant="outline" className="border-orange-500 text-orange-500">Optional</Badge> :
          <Badge variant="secondary" className="text-muted-foreground">Pending</Badge>
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'users':
        return <Users className="w-4 h-4" />
      case 'exercises':
        return <Dumbbell className="w-4 h-4" />
      case 'nutrition':
        return <ChefHat className="w-4 h-4" />
      case 'calendar':
        return <Calendar className="w-4 h-4" />
      case 'goals':
        return <Target className="w-4 h-4" />
      default:
        return <Settings className="w-4 h-4" />
    }
  }

  // Handle step navigation with authentication check
  const handleStepClick = useCallback((path?: string, status?: StepStatus) => {
    if (!path || status === 'disabled') return

    if (!isAuthenticated) {
      // Store the intended destination for after login
      sessionStorage.setItem('postAuthRedirectTo', path)
      setIsLoginOpen(true)
    } else {
      // User is authenticated, proceed with navigation
      router.push(path)
    }
  }, [isAuthenticated, router])


  // Progress counts only required steps (ignore optional)
  const requiredSteps = steps.filter(s => !s.isOptional)
  const completedRequiredSteps = requiredSteps.filter(s => s.status === 'completed').length
  const totalRequiredSteps = requiredSteps.length
  const progressPercentage = (completedRequiredSteps / Math.max(totalRequiredSteps, 1)) * 100

  const stepsByCategory = steps.reduce((acc, step) => {
    if (!acc[step.category]) acc[step.category] = []
    acc[step.category].push(step)
    return acc
  }, {} as Record<string, OnboardingStep[]>)

  // Auto-redirect when onboarding is complete
  useEffect(() => {
    if (completedRequiredSteps >= totalRequiredSteps && totalRequiredSteps > 0) {
      // Mark onboarding as complete
      localStorage.setItem('fitspo:onboarding_complete', 'true')
      localStorage.setItem('fitspo:onboarding_completed_at', new Date().toISOString())

      // Small delay to show completion state, then redirect
      const timer = setTimeout(() => {
        router.replace('/plans/workout-plans')
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [completedRequiredSteps, totalRequiredSteps, router])

  return (
    <div className="min-h-screen bg-card">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Welcome to Fitspo
          </h1>
          <p className="text-lg text-muted-foreground">
            Let's get you set up with everything you need to achieve your fitness goals
          </p>

          {/* Progress Overview */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="text-center mb-6">
              <div className="text-sm text-muted-foreground mb-2">Setup Progress</div>
              <div className="text-2xl font-bold text-foreground mb-2">
                {Math.round(progressPercentage)}%
              </div>
              <div className="text-sm text-muted-foreground">
                {completedRequiredSteps} of {totalRequiredSteps} steps completed
              </div>
            </div>

            <div className="space-y-3">
              <Progress value={progressPercentage} className="h-2" />

              {/* Minimal Stats */}
              <div className="flex items-center justify-center gap-8 pt-2">
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">{usersCount}</div>
                  <div className="text-xs text-muted-foreground">Users</div>
                </div>
                <div className="w-px h-6 bg-border"></div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">{spacesCount}</div>
                  <div className="text-xs text-muted-foreground">Spaces</div>
                </div>
                <div className="w-px h-6 bg-border"></div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">{templatesCount}</div>
                  <div className="text-xs text-muted-foreground">Templates</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Steps by Category */}
        <div ref={containerRef} className="max-w-6xl mx-auto relative overflow-visible min-h-[600px] px-0 space-y-8 sm:space-y-16">
          {Object.entries(stepsByCategory).map(([category, categorySteps], index) => (
            <Collapsible
              key={category}
              open={expandedSections[category]}
              onOpenChange={(open) => handleSectionOpenChange(category, open)}
            >
              <div
                ref={
                  category === 'users' ? usersRef :
                  category === 'exercises' ? exercisesRef :
                  category === 'nutrition' ? nutritionRef :
                  category === 'goals' ? goalsRef : undefined
                }
                className="relative z-30"
              >
                <Card className="overflow-hidden relative z-30">
                <CollapsibleTrigger asChild>
                  <CardHeader className="bg-card border-b cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(category)}
                        <CardTitle className="capitalize text-base">{category}</CardTitle>
                      </div>
                      <div className="flex items-center">
                        {expandedSections[category] ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <CardDescription className="text-muted-foreground">
                      {category === 'users' && 'Set up your personal profile and preferences'}
                      {category === 'exercises' && 'Configure your workout environment and routines'}
                      {category === 'nutrition' && 'Manage your meal planning and recipes'}
                      {category === 'calendar' && 'Sync your schedule and track progress'}
                      {category === 'goals' && 'Monitor your fitness journey and achievements'}
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="p-4 sm:p-6">
                    <div className="grid gap-3 sm:gap-4">
                      {categorySteps.map((step, index) => (
                        <div key={step.id}>
                          <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                            <div className="flex-shrink-0 mt-1">
                              {getStatusIcon(step.status, step.isOptional)}
                            </div>

                            <div className="flex-grow">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="text-foreground font-medium text-sm">
                                  {step.title}
                                </div>
                                {getStatusBadge(step.status, step.isOptional)}
                              </div>

                              <p className="text-muted-foreground text-sm mb-3">
                                {step.description}
                              </p>

                              {/* Dependencies */}
                              {step.dependencies && step.dependencies.length > 0 && (
                                <div className="text-xs text-muted-foreground mb-3">
                                  <span className="font-medium">Requires: </span>
                                  {step.dependencies.map(dep => {
                                    const depStep = steps.find(s => s.id === dep)
                                    return depStep ? depStep.title : dep
                                  }).join(', ')}
                                </div>
                              )}

                              {/* Action Button */}
                              <div className="flex items-center gap-2">
                                <Button
                                  variant={step.status === 'completed' ? 'secondary' : 'default'}
                                  size="sm"
                                  disabled={step.status === 'disabled'}
                                  onClick={() => handleStepClick(step.path, step.status)}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  {step.icon}
                                  {step.status === 'completed' ? 'View' : 'Get Started'}
                                  <ArrowRight className="w-4 h-4" />
                                </Button>

                                {step.status === 'disabled' && (
                                  <span className="text-xs text-muted-foreground">
                                    Complete required steps first
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {index < categorySteps.length - 1 && <Separator className="my-2" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
                </Card>
              </div>
            </Collapsible>
          ))}

          {/* Animated Beams */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={usersRef}
            toRef={exercisesRef}
            curvature={-30}
            startXOffset={0}
            startYOffset={10}
            endXOffset={0}
            endYOffset={-10}
            gradientStartColor="#3b82f6"
            gradientStopColor="#8b5cf6"
            speed={1.2}
            pathWidth={4}
            pathOpacity={0.8}
            gradientDirection="vertical"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={exercisesRef}
            toRef={nutritionRef}
            curvature={-30}
            startXOffset={0}
            startYOffset={8}
            endXOffset={0}
            endYOffset={-8}
            gradientStartColor="#8b5cf6"
            gradientStopColor="#10b981"
            speed={1.6}
            delay={1}
            pathWidth={4}
            pathOpacity={0.8}
            gradientDirection="vertical"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={nutritionRef}
            toRef={goalsRef}
            curvature={-30}
            startXOffset={0}
            startYOffset={6}
            endXOffset={0}
            endYOffset={-6}
            gradientStartColor="#10b981"
            gradientStopColor="#f59e0b"
            speed={2.2}
            delay={2}
            pathWidth={4}
            pathOpacity={0.8}
            gradientDirection="vertical"
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-12 max-w-md mx-auto">
          {completedRequiredSteps >= totalRequiredSteps ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Award className="w-5 h-5 text-primary" />
                <h3 className="text-base font-semibold text-foreground">Setup Complete</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Redirecting to your fitness dashboard...
              </p>
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                <span className="text-xs text-muted-foreground">Starting your fitness journey</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  try {
                    localStorage.removeItem('fitspo:onboarding_complete')
                    localStorage.removeItem('fitspo:onboarding_completed_at')
                  } catch {}
                  try { window.location.reload() } catch {}
                }}
                className="w-full text-xs text-muted-foreground cursor-pointer"
              >
                Reset Onboarding
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Login Modal */}
      <Sheet open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <SheetContent
          side="bottom"
          animation="fade"
          className="p-0 inset-0 w-screen sm:h-dvh h-svh max-w-none rounded-none border-0 [&_[data-slot=sheet-close]]:z-[60]"
          overlayClassName="!bg-transparent"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sign In</SheetTitle>
          </SheetHeader>
          {/* Full-screen flickering grid background */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <FlickeringGrid
              squareSize={4}
              gridGap={6}
              flickerChance={0.3}
              color="#283DFF"
              maxOpacity={0.6}
              className="w-full h-full opacity-80"
            />
          </div>

          {/* Content overlay */}
          <div className="absolute inset-x-0 top-16 bottom-0 z-10 flex min-h-full flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
              <LoginForm onSuccess={() => setIsLoginOpen(false)} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

'use client'

import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Dumbbell, Activity } from 'lucide-react'
import { ExerciseDropdown } from "@/app/fitness-calculator/ExerciseDropdown"

// Front assets
import FrontHead from '@/assets/body-vector/front-body/Head.svg'
import FrontHands from '@/assets/body-vector/front-body/hands.svg'
import FrontDeltoids from '@/assets/body-vector/front-body/Deltoids.svg'
import FrontBiceps from '@/assets/body-vector/front-body/Biceps.svg'
import FrontChest from '@/assets/body-vector/front-body/Chest.svg'
import FrontAbs from '@/assets/body-vector/front-body/Rectus Abdominis.svg'
import FrontObliques from '@/assets/body-vector/front-body/Obliques.svg'
import FrontTrapezius from '@/assets/body-vector/front-body/Trapezius.svg'
import FrontForearms from '@/assets/body-vector/front-body/Forearms.svg'
import FrontQuads from '@/assets/body-vector/front-body/Quadriceps.svg'
import FrontLowerLegs from '@/assets/body-vector/front-body/Lower Legs.svg'
import FrontNeck from '@/assets/body-vector/front-body/Neck.svg'

// Back assets
import BackHead from '@/assets/body-vector/back-body/Vector.svg'
import BackHands from '@/assets/body-vector/back-body/Hands.svg'
import BackTraps from '@/assets/body-vector/back-body/Traps.svg'
import BackTriceps from '@/assets/body-vector/back-body/Triceps.svg'
import BackUpperBack from '@/assets/body-vector/back-body/Upper Back.svg'
import BackLowerBack from '@/assets/body-vector/back-body/Lower Back.svg'
import BackGlutes from '@/assets/body-vector/back-body/Glutes.svg'
import BackHamstrings from '@/assets/body-vector/back-body/Hamstrings.svg'
import BackCalves from '@/assets/body-vector/back-body/Calves.svg'
import BackForearms from '@/assets/body-vector/back-body/Forearms.svg'
import BackShoulders from '@/assets/body-vector/back-body/Shoulders.svg'

interface MuscleContribution {
  name: string
  percentage: number
  involvement: number
}



interface WebBodyHighlighterProps {
  muscleGroups: MuscleContribution[]
  exerciseName: string
  // Optional props to enable header exercise dropdown without breaking existing callsites
  selectedExerciseId?: string
  setSelectedExerciseId?: (id: string) => void
  isLoadingExercises?: boolean
  exerciseLoadError?: string | null
  rightSlot?: ReactNode
}

// Mapping from our muscle names to body part areas
const muscleToBodyPartMap: { [key: string]: { id: string; name: string; side?: 'front' | 'back' } } = {
  'Biceps': { id: 'biceps', name: 'Biceps', side: 'front' },
  'Triceps': { id: 'triceps', name: 'Triceps', side: 'back' }, 
  'Deltoids': { id: 'deltoids', name: 'Deltoids', side: 'front' },
  'Trapezius': { id: 'trapezius', name: 'Trapezius', side: 'back' },
  'Upper Chest': { id: 'chest', name: 'Chest', side: 'front' },
  'Middle Chest': { id: 'chest', name: 'Chest', side: 'front' },
  'Lower Chest': { id: 'chest', name: 'Chest', side: 'front' },
  'Pectorals': { id: 'chest', name: 'Chest', side: 'front' },
  'Latissimus Dorsi': { id: 'lats', name: 'Lats', side: 'back' },
  'Rhomboids': { id: 'upper-back', name: 'Upper Back', side: 'back' },
  'Lower Back': { id: 'lower-back', name: 'Lower Back', side: 'back' },
  'Upper Back': { id: 'upper-back', name: 'Upper Back', side: 'back' },
  'Rectus Abdominis': { id: 'abs', name: 'Abs', side: 'front' },
  'Obliques': { id: 'obliques', name: 'Obliques', side: 'front' },
  'Gluteus Maximus': { id: 'glutes', name: 'Glutes', side: 'back' },
  'Quadriceps': { id: 'quads', name: 'Quadriceps', side: 'front' },
  'Hamstrings': { id: 'hamstrings', name: 'Hamstrings', side: 'back' },
  'Calves': { id: 'calves', name: 'Calves' },
  'Forearms': { id: 'forearms', name: 'Forearms' },
}

// Function to get color based on involvement level with intensity variations
const getInvolvementColor = (involvement: number) => {
  if (involvement >= 4.5) return 'hsl(0 100% 40%)' // very high - bright red
  if (involvement >= 4) return 'hsl(0 85% 40%)' // high - red
  if (involvement >= 3.5) return 'hsl(15 90% 45%)' // medium-high+ - red-orange
  if (involvement >= 3) return 'hsl(30 85% 40%)' // medium-high - orange
  if (involvement >= 2.5) return 'hsl(45 80% 45%)' // medium+ - yellow-orange
  if (involvement >= 2) return 'hsl(60 75% 30%)' // medium - yellow
  if (involvement >= 1.5) return 'hsl(120 60% 45%)' // low+ - light green
  if (involvement >= 1) return 'hsl(200 100% 24%)' // low - light blue
  return 'hsl(var(--muted))' // minimal involvement - muted
}

// Function to get intensity description
const getIntensityDescription = (involvement: number) => {
  if (involvement >= 4.5) return 'Very High'
  if (involvement >= 4) return 'High'
  if (involvement >= 3.5) return 'Med-High+'
  if (involvement >= 3) return 'Med-High'
  if (involvement >= 2.5) return 'Medium+'
  if (involvement >= 2) return 'Medium'
  if (involvement >= 1.5) return 'Low+'
  if (involvement >= 1) return 'Low'
  return 'Minimal'
}

// Shared layer type for placement
type LayerPlacement = { topPct: number; leftPct: number; widthPct: number; zIndex?: number }

const SvgLayer = ({
  Component,
  color,
  involvement,
  onClick,
  placement,
  title,
  forceFillChildren,
  onHover,
}: {
  Component: React.FC<React.SVGProps<SVGSVGElement>>
  color: string
  involvement: number
  onClick: () => void
  placement: LayerPlacement
  title: string
  forceFillChildren?: boolean
  onHover?: (muscleName: string | null) => void
}) => {
  const intensityDescription = getIntensityDescription(involvement)
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`absolute cursor-pointer transition-all hover:opacity-90 ${forceFillChildren ? 'wlc-force-fill' : ''}`}
          style={{
            top: `${placement.topPct}%`,
            left: `${placement.leftPct}%`,
            width: `${placement.widthPct}%`,
            // provide CSS var for optional force fill
            // @ts-expect-error CSS variable
            '--wlc-fill': color,
            // Allow visual overflow; interactive hitbox is the wrapper bounds
            overflow: 'visible',
            // Layer ordering for overlapping hitboxes
            zIndex: placement.zIndex,
          }}
          onClick={onClick}
          onMouseEnter={() => onHover?.(title)}
          onMouseLeave={() => onHover?.(null)}
          data-involvement={involvement}
        >
          <Component
            style={{ fill: color, pointerEvents: 'none' }}
            className="w-full h-auto"
            aria-label={title}
            focusable={false}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">
            Intensity: {intensityDescription} (Level {involvement})
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// Front view body component (layered from individual SVG exports)
const FrontBodySVG = ({ muscleData, onMuscleClick, onHover }: {
  muscleData: { [key: string]: { color: string; involvement: number } },
  onMuscleClick: (muscle: string) => void
  onHover?: (muscleName: string | null) => void
}) => {
  // Placement map relative to a 327x652 frame, expressed in percentages
  const placements: Record<string, LayerPlacement> = {
    head: { topPct: -4, leftPct: 41, widthPct: 25, zIndex: 4 },
    neck: { topPct: 7.5, leftPct: 45.8, widthPct: 15, zIndex: 4},
    trapezius: { topPct: 11, leftPct: 34.5, widthPct: 44 },
    hands: { topPct: 47, leftPct: -5.2, widthPct: 121 },
    deltoids: { topPct: 15, leftPct: 19, widthPct: 69, zIndex: 1 },
    chest: { topPct: 16.7, leftPct: 30, widthPct: 47, zIndex: 3 },
    biceps: { topPct: 23.4, leftPct: 16, widthPct: 99, zIndex: 2 },
    abs: { topPct: 24, leftPct: 42, widthPct: 24, zIndex: 3 },
    obliques: { topPct: 16, leftPct: 31, widthPct: 45, zIndex: 3 },
    forearms: { topPct: 33.5, leftPct: 5.5, widthPct: 99 },
    quads: { topPct: 44, leftPct: 28, widthPct: 51, zIndex: 3 },
    calves: { topPct: 68, leftPct: 21.5, widthPct: 66.5 }, // using Lower Legs for front calves
  }

  return (
    <div className="relative overflow-visible" style={{ aspectRatio: '327/652', overflow: 'visible' }}>


      {/* Calves (front lower legs) */}
      <SvgLayer
        Component={FrontLowerLegs}
        color={muscleData.calves?.color || 'hsl(var(--muted))'}
        involvement={muscleData.calves?.involvement || 0}
        onClick={() => onMuscleClick('Calves')}
        placement={placements.calves}
        title="Calves"
        forceFillChildren
        onHover={onHover}
      />
        {/* Quadriceps */}
        <SvgLayer
        Component={FrontQuads}
        color={muscleData.quads?.color || 'hsl(var(--muted))'}
        involvement={muscleData.quads?.involvement || 0}
        onClick={() => onMuscleClick('Quadriceps')}
        placement={placements.quads}
        title="Quadriceps"
        forceFillChildren
        onHover={onHover}
      />
      {/* Obliques */}
      <SvgLayer
        Component={FrontObliques}
        color={muscleData.obliques?.color || 'hsl(var(--muted))'}
        involvement={muscleData.obliques?.involvement || 0}
        onClick={() => onMuscleClick('Obliques')}
        placement={placements.obliques}
        title="Obliques"
        forceFillChildren
        onHover={onHover}
      />
      {/* Trapezius */}
      <SvgLayer
        Component={FrontTrapezius}
        color={muscleData.trapezius?.color || 'hsl(var(--muted))'}
        involvement={muscleData.trapezius?.involvement || 0}
        onClick={() => onMuscleClick('Trapezius')}
        placement={placements.trapezius}
        title="Trapezius"
        forceFillChildren
        onHover={onHover}
      />
      {/* Abs */}
      <SvgLayer
        Component={FrontAbs}
        color={muscleData.abs?.color || 'hsl(var(--muted))'}
        involvement={muscleData.abs?.involvement || 0}
        onClick={() => onMuscleClick('Rectus Abdominis')}
        placement={placements.abs}
        title="Rectus Abdominis"
        forceFillChildren
        onHover={onHover}
      />
      {/* Biceps */}
      <SvgLayer
        Component={FrontBiceps}
        color={muscleData.biceps?.color || 'hsl(var(--muted))'}
        involvement={muscleData.biceps?.involvement || 0}
        onClick={() => onMuscleClick('Biceps')}
        placement={placements.biceps}
        title="Biceps"
        forceFillChildren
        onHover={onHover}
      />
      {/* Forearms */}
      <SvgLayer
        Component={FrontForearms}
        color={muscleData.forearms?.color || 'hsl(var(--muted))'}
        involvement={muscleData.forearms?.involvement || 0}
        onClick={() => onMuscleClick('Forearms')}
        placement={placements.forearms}
        title="Forearms"
        forceFillChildren
        onHover={onHover}
      />
      {/* Hands (visual only) */}
      <SvgLayer
        Component={FrontHands}
        color={'black'}
        involvement={0}
        onClick={() => {}}
        placement={placements.hands}
        title="Hands"
        forceFillChildren
        onHover={onHover}
      />
        {/* Chest */}
        <SvgLayer
        Component={FrontChest}
        color={muscleData.chest?.color || 'hsl(var(--muted))'}
        involvement={muscleData.chest?.involvement || 0}
        onClick={() => onMuscleClick('Chest')}
        placement={placements.chest}
        title="Chest"
        forceFillChildren
        onHover={onHover}
      />
        {/* Deltoids */}
        <SvgLayer
        Component={FrontDeltoids}
        color={muscleData.deltoids?.color || 'hsl(var(--muted))'}
        involvement={muscleData.deltoids?.involvement || 0}
        onClick={() => onMuscleClick('Deltoids')}
        placement={placements.deltoids}
        title="Deltoids"
        forceFillChildren
        onHover={onHover}
      />
        {/* Neck (visual only) */}
        <SvgLayer
        Component={FrontNeck}
        color={'hsl(var(--muted))'}
        involvement={0}
        onClick={() => {}}
        placement={placements.neck}
        title="Neck"
        forceFillChildren
        onHover={onHover}
      />
        {/* Head (visual only) */}
        <SvgLayer
        Component={FrontHead}
        color={'hsl(var(--muted))'}
        involvement={0}
        onClick={() => {}}
        placement={placements.head}
        title="Head"
        forceFillChildren
        onHover={onHover}
      />
    </div>
  )
}

// Back view body component (layered SVGs)
const BackBodySVG = ({ muscleData, onMuscleClick, onHover }: {
  muscleData: { [key: string]: { color: string; involvement: number } },
  onMuscleClick: (muscle: string) => void
  onHover?: (muscleName: string | null) => void
}) => {
  const placements: Record<string, LayerPlacement> = {
    head: { topPct: -4, leftPct: 41, widthPct: 50 },
    hands: { topPct: 47.5, leftPct: -5.2, widthPct: 120 },
    BackShoulders: { topPct: 16.3, leftPct: 18.5, widthPct: 99, zIndex: 2 },
    trapezius: { topPct: 4, leftPct: 27, widthPct: 52 },
    triceps: { topPct: 23.4, leftPct: 15.5, widthPct: 78, zIndex: 1 },
    'upper-back': { topPct: 19, leftPct: 30.5, widthPct: 55, zIndex: 2 },
    'lower-back': { topPct: 36, leftPct: 42.5, widthPct: 39, zIndex: 3 },
    glutes: { topPct: 42.5, leftPct: 31, widthPct: 44, zIndex: 4 },
    hamstrings: { topPct: 49.5, leftPct: 27.5, widthPct: 52 },
    calves: { topPct: 68, leftPct: 18.5, widthPct: 69 },
    forearms: { topPct: 30, leftPct: 5.5, widthPct: 99 },
  }

  // For lats mapping to upper back as requested
  const upperBackColor = muscleData['lats']?.color || muscleData['upper-back']?.color || 'hsl(var(--muted))'
  const upperBackInvolvement = muscleData['lats']?.involvement || muscleData['upper-back']?.involvement || 0

  return (
    <div className="relative overflow-visible" style={{ aspectRatio: '327/652', overflow: 'visible' }}>
      {/* Calves */}
      <SvgLayer
        Component={BackCalves}
        color={muscleData.calves?.color || 'hsl(var(--muted))'}
        involvement={muscleData.calves?.involvement || 0}
        onClick={() => onMuscleClick('Calves')}
        placement={placements.calves}
        title="Calves"
        forceFillChildren
        onHover={onHover}
      />
      {/* Head (visual only) */}
      <SvgLayer
        Component={BackHead}
        color={'hsl(var(--muted))'}
        involvement={0}
        onClick={() => {}}
        placement={placements.head}
        title="Head"
        forceFillChildren
        onHover={onHover}
      />
      {/* Hamstrings */}
      <SvgLayer
        Component={BackHamstrings}
        color={muscleData.hamstrings?.color || 'hsl(var(--muted))'}
        involvement={muscleData.hamstrings?.involvement || 0}
        onClick={() => onMuscleClick('Hamstrings')}
        placement={placements.hamstrings}
        title="Hamstrings"
        forceFillChildren
        onHover={onHover}
      />

      {/* Glutes */}
      <SvgLayer
        Component={BackGlutes}
        color={muscleData.glutes?.color || 'hsl(var(--muted))'}
        involvement={muscleData.glutes?.involvement || 0}
        onClick={() => onMuscleClick('Gluteus Maximus')}
        placement={placements.glutes}
        title="Glutes"
        forceFillChildren
        onHover={onHover}
      />

      {/* Lower Back */}
      <SvgLayer
        Component={BackLowerBack}
        color={muscleData['lower-back']?.color || 'hsl(var(--muted))'}
        involvement={muscleData['lower-back']?.involvement || 0}
        onClick={() => onMuscleClick('Lower Back')}
        placement={placements['lower-back']}
        title="Lower Back"
        forceFillChildren
        onHover={onHover}
      />

      {/* Upper Back (includes Latissimus Dorsi mapping) */}
      <SvgLayer
        Component={BackUpperBack}
        color={upperBackColor}
        involvement={upperBackInvolvement}
        onClick={() => onMuscleClick('Latissimus Dorsi')}
        placement={placements['upper-back']}
        title="Upper Back / Lats"
        forceFillChildren
        onHover={onHover}
      />

      {/* Triceps */}
      <SvgLayer
        Component={BackTriceps}
        color={muscleData.triceps?.color || 'hsl(var(--muted))'}
        involvement={muscleData.triceps?.involvement || 0}
        onClick={() => onMuscleClick('Triceps')}
        placement={placements.triceps}
        title="Triceps"
        forceFillChildren
        onHover={onHover}
      />

      {/* Deltoids (Back Shoulders) */}
      <SvgLayer
        Component={BackShoulders}
        color={muscleData.deltoids?.color || 'hsl(var(--muted))'}
        involvement={muscleData.deltoids?.involvement || 0}
        onClick={() => onMuscleClick('Deltoids')}
        placement={placements.BackShoulders}
        title="Deltoids"
        forceFillChildren
        onHover={onHover}
      />

      {/* Forearms */}
      <SvgLayer
        Component={BackForearms}
        color={muscleData.forearms?.color || 'hsl(var(--muted))'}
        involvement={muscleData.forearms?.involvement || 0}
        onClick={() => onMuscleClick('Forearms')}
        placement={placements.forearms}
        title="Forearms"
        forceFillChildren
        onHover={onHover}
      />

      {/* Hands (visual only) */}
      <SvgLayer
        Component={BackHands}
        color={'black'}
        involvement={0}
        onClick={() => {}}
        placement={placements.hands}
        title="Hands"
        forceFillChildren
        onHover={onHover}
      />

      {/* Trapezius */}
      <SvgLayer
        Component={BackTraps}
        color={muscleData.trapezius?.color || 'hsl(var(--muted))'}
        involvement={muscleData.trapezius?.involvement || 0}
        onClick={() => onMuscleClick('Trapezius')}
        placement={placements.trapezius}
        title="Trapezius"
        forceFillChildren
        onHover={onHover}
      />

    </div>
  )
}

export function WebBodyHighlighter({ muscleGroups, exerciseName, selectedExerciseId, setSelectedExerciseId, isLoadingExercises, exerciseLoadError, rightSlot }: WebBodyHighlighterProps) {
  const [side, setSide] = useState<'front' | 'back'>('front')
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)

  // Transform muscle groups data for the highlighter
  const muscleData: { [key: string]: { color: string; involvement: number } } = {}
  
  muscleGroups.forEach(muscle => {
    const bodyPart = muscleToBodyPartMap[muscle.name]
    if (bodyPart) {
      muscleData[bodyPart.id] = {
        color: getInvolvementColor(muscle.involvement),
        involvement: muscle.involvement
      }
    }
  })

  const handleMuscleClick = (muscleName: string) => {
    setSelectedMuscle(muscleName)
  }

  // Hover handler kept to satisfy props on SvgLayer consumers
  const handleHover = () => {}

  const selectedMuscleData = selectedMuscle ? muscleGroups.find(m => m.name === selectedMuscle) : null

  // Right side content is now provided by parent via rightSlot

  return (
    <TooltipProvider>
      <Card className="bg-transparent border-0 shadow-none h-full">
        <CardContent className="p-2 h-full">
          <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Left side: Muscle involvement container */}
            <div className="lg:w-1/2 flex flex-col">
              <div className="flex flex-col gap-4 flex-1">
                {/* Title and Description */}
                <div className="flex items-center justify-between mb-4 gap-3">
                  <div className="flex items-center space-x-2">
                    <Dumbbell className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg font-semibold">Muscle Involvement</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm text-muted-foreground mb-4">
                  Interactive muscle activation for {exerciseName.toLowerCase()}
                </CardDescription>
                
                {/* Exercise dropdown */}
                {typeof setSelectedExerciseId === 'function' && typeof selectedExerciseId === 'string' && (
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <Activity className="mr-2 h-4 w-4" />
                      <span className="text-sm font-medium">Select Exercise</span>
                    </div>
                    <ExerciseDropdown
                      selectedExerciseId={selectedExerciseId}
                      onSelectExercise={setSelectedExerciseId}
                      isLoading={Boolean(isLoadingExercises)}
                      error={exerciseLoadError ?? null}
                      align="start"
                      side="bottom"
                      sideOffset={6}
                      contentClassName="min-w-[400px]"
                    />
                  </div>
                )}

                {/* Tabs for front/back view */}
                <Tabs defaultValue={side} onValueChange={(value) => setSide(value as 'front' | 'back')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="front">Front</TabsTrigger>
                    <TabsTrigger value="back">Back</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="front" className="mt-6">
                    <div className="flex flex-col gap-4">
                      {/* Body Highlighter */}
                      <div className="flex justify-center">
                        <div className="max-w-[280px] w-full">
                          <FrontBodySVG muscleData={muscleData} onMuscleClick={handleMuscleClick} onHover={handleHover} />
                        </div>
                      </div>
                      
                      {/* Selected Muscle Card */}
                      <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border/30 w-full">
                        <h4 className="font-medium text-sm mb-2">Selected Muscle</h4>
                        {selectedMuscleData ? (
                          <div className="flex items-center space-x-2 flex-wrap gap-2">
                            <Badge variant="secondary">
                              {selectedMuscleData.name}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              style={{ 
                                backgroundColor: getInvolvementColor(selectedMuscleData.involvement),
                                color: 'white',
                                borderColor: getInvolvementColor(selectedMuscleData.involvement)
                              }}
                            >
                              {getIntensityDescription(selectedMuscleData.involvement)}
                            </Badge>
                            <Badge variant="outline">
                              Level: {selectedMuscleData.involvement}
                            </Badge>
                            <Badge variant="outline">
                              {selectedMuscleData.percentage.toFixed(1)}%
                            </Badge>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Click on a muscle to see details
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="back" className="mt-6">
                    <div className="flex flex-col gap-4">
                      {/* Body Highlighter */}
                      <div className="flex justify-center">
                        <div className="max-w-[280px] w-full">
                          <BackBodySVG muscleData={muscleData} onMuscleClick={handleMuscleClick} onHover={handleHover} />
                        </div>
                      </div>

                      {/* Selected Muscle Card */}
                      <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border/30 w-full">
                        <h4 className="font-medium text-sm mb-2">Selected Muscle</h4>
                        {selectedMuscleData ? (
                          <div className="flex items-center space-x-2 flex-wrap gap-2">
                            <Badge variant="secondary">
                              {selectedMuscleData.name}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              style={{ 
                                backgroundColor: getInvolvementColor(selectedMuscleData.involvement),
                                color: 'white',
                                borderColor: getInvolvementColor(selectedMuscleData.involvement)
                              }}
                            >
                              {getIntensityDescription(selectedMuscleData.involvement)}
                            </Badge>
                            <Badge variant="outline">
                              Level: {selectedMuscleData.involvement}
                            </Badge>
                            <Badge variant="outline">
                              {selectedMuscleData.percentage.toFixed(1)}%
                            </Badge>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Click on a muscle to see details
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Right side: Custom content slot */}
            <div className="lg:w-1/2 flex flex-col">
              <div className="flex flex-col gap-4 flex-1">
                {rightSlot}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}



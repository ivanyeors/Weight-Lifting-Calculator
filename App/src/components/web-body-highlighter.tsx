import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState } from 'react'
import { Eye, Dumbbell } from 'lucide-react'
import { ExerciseDropdown } from "@/components/ExerciseDropdown"
import { Button } from "@/components/ui/button"

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

type Exercise = { id: string; name: string; description: string; baseWeightFactor: number }

interface WebBodyHighlighterProps {
  muscleGroups: MuscleContribution[]
  exerciseName: string
  // Optional props to enable header exercise dropdown without breaking existing callsites
  exercises?: Exercise[]
  selectedExerciseId?: string
  setSelectedExerciseId?: (id: string) => void
  isLoadingExercises?: boolean
  exerciseLoadError?: string | null
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
  if (involvement >= 4.5) return 'hsl(0 100% 50%)' // very high - bright red
  if (involvement >= 4) return 'hsl(0 85% 60%)' // high - red
  if (involvement >= 3.5) return 'hsl(15 90% 55%)' // medium-high+ - red-orange
  if (involvement >= 3) return 'hsl(30 85% 50%)' // medium-high - orange
  if (involvement >= 2.5) return 'hsl(45 80% 55%)' // medium+ - yellow-orange
  if (involvement >= 2) return 'hsl(60 75% 50%)' // medium - yellow
  if (involvement >= 1.5) return 'hsl(120 60% 45%)' // low+ - light green
  if (involvement >= 1) return 'hsl(200 60% 60%)' // low - light blue
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

// Glow effect removed

// Shared layer type for placement
type LayerPlacement = { topPct: number; leftPct: number; widthPct: number }

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
          }}
          onClick={onClick}
          onMouseEnter={() => onHover?.(title)}
          onMouseLeave={() => onHover?.(null)}
          data-involvement={involvement}
        >
          <Component
            style={{ fill: color }}
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
    head: { topPct: -4, leftPct: 41, widthPct: 25 },
    neck: { topPct: 7.5, leftPct: 45.8, widthPct: 15 },
    trapezius: { topPct: 11, leftPct: 34.5, widthPct: 44 },
    hands: { topPct: 47, leftPct: -5.2, widthPct: 121 },
    deltoids: { topPct: 15, leftPct: 19, widthPct: 99 },
    chest: { topPct: 16.7, leftPct: 30, widthPct: 47 },
    biceps: { topPct: 23.4, leftPct: 16, widthPct: 99 },
    abs: { topPct: 24, leftPct: 42, widthPct: 24 },
    obliques: { topPct: 16, leftPct: 31, widthPct: 45 },
    forearms: { topPct: 33.5, leftPct: 5.5, widthPct: 99 },
    quads: { topPct: 44, leftPct: 28, widthPct: 51 },
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
    hands: { topPct: 47.5, leftPct: -5.2, widthPct: 121 },
    BackShoulders: { topPct: 16.3, leftPct: 19, widthPct: 99 },
    trapezius: { topPct: 4, leftPct: 27, widthPct: 99 },
    triceps: { topPct: 23.4, leftPct: 16, widthPct: 99 },
    'upper-back': { topPct: 19, leftPct: 30.5, widthPct: 55 },
    'lower-back': { topPct: 36, leftPct: 42.5, widthPct: 39 },
    glutes: { topPct: 42.5, leftPct: 31, widthPct: 55 },
    hamstrings: { topPct: 50, leftPct: 27, widthPct: 55 },
    calves: { topPct: 68, leftPct: 18, widthPct: 99 },
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

export function WebBodyHighlighter({ muscleGroups, exerciseName, exercises, selectedExerciseId, setSelectedExerciseId, isLoadingExercises, exerciseLoadError }: WebBodyHighlighterProps) {
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

  // Simple video search/render panel
  const [isSearching, setIsSearching] = useState(false)
  const [videoUrls, setVideoUrls] = useState<string[]>([])
  const [videoIndex, setVideoIndex] = useState(0)

  const placeholderShortcode = 'DNd1JdFK7Kk'
  const placeholderInsta = `https://www.instagram.com/reel/${placeholderShortcode}/` // clean base

  const toEmbedUrl = (url: string): string => {
    try {
      const u = new URL(url)
      if (u.hostname.includes('instagram.com')) {
        // Try to extract shortcode and use embed path
        const parts = u.pathname.split('/').filter(Boolean)
        const kind = parts[0]
        const code = parts[1] || placeholderShortcode
        if (kind === 'reel' || kind === 'p' || kind === 'tv') {
          return `https://www.instagram.com/${kind}/${code}/embed`
        }
        return `https://www.instagram.com/reel/${placeholderShortcode}/embed`
      }
      return url
    } catch {
      return placeholderInsta + 'embed'
    }
  }

  const currentVideoUrl = videoUrls.length > 0 ? videoUrls[videoIndex] : placeholderInsta
  const embeddedUrl = toEmbedUrl(currentVideoUrl)

  const searchVideos = async () => {
    setIsSearching(true)
    try {
      // Optional n8n webhook: set NEXT_PUBLIC_N8N_WEBHOOK_URL to enable
      // Expected response: { videos: string[] }
      const webhook = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL as string | undefined
      let found: string[] | null = null
      if (webhook) {
        try {
          const res = await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: exerciseName }),
          })
          if (res.ok) {
            const data = await res.json().catch(() => null)
            if (data && Array.isArray(data.videos)) {
              found = data.videos as string[]
            }
          }
        } catch {
          // ignore webhook errors and fall back to placeholders
        }
      }
      if (!found || found.length === 0) {
        // Fallback placeholders (3-5 variations of the same reel for demo)
        found = [
          `https://www.instagram.com/reel/${placeholderShortcode}/`,
          `https://www.instagram.com/reel/${placeholderShortcode}/?variant=2`,
          `https://www.instagram.com/reel/${placeholderShortcode}/?variant=3`,
        ]
      }
      setVideoUrls(found)
      setVideoIndex(0)
    } finally {
      setIsSearching(false)
    }
  }

  const nextVideo = () => {
    if (videoUrls.length <= 1) return
    setVideoIndex((i) => (i + 1) % videoUrls.length)
  }

  const prevVideo = () => {
    if (videoUrls.length <= 1) return
    setVideoIndex((i) => (i - 1 + videoUrls.length) % videoUrls.length)
  }

  return (
    <TooltipProvider>
      <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardContent className="p-6">
        <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center space-x-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Muscle Involvement</CardTitle>
          </div>
          {/* Optional exercise dropdown (top-right) */}
          {Array.isArray(exercises) && typeof setSelectedExerciseId === 'function' && typeof selectedExerciseId === 'string' && (
            <ExerciseDropdown
              exercises={exercises}
              selectedExerciseId={selectedExerciseId}
              onSelectExercise={setSelectedExerciseId}
              isLoading={Boolean(isLoadingExercises)}
              error={exerciseLoadError ?? null}
              align="end"
              side="bottom"
              sideOffset={6}
              contentClassName="min-w-[300px]"
            />
          )}
        </div>
        <CardDescription className="text-sm text-muted-foreground mb-4">
          Interactive muscle activation for {exerciseName.toLowerCase()}
        </CardDescription>
        
        <Tabs defaultValue={side} onValueChange={(value) => setSide(value as 'front' | 'back')}>
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="front" className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>Front</span>
            </TabsTrigger>
            <TabsTrigger value="back" className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>Back</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="front" className="mt-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left side: Body vector and selected muscle stacked */}
              <div className="flex flex-col gap-4 lg:w-1/2 lg:justify-between">
                {/* Body Highlighter */}
                <div className="flex justify-center">
                  <div className="max-w-[280px] w-full">
                    <FrontBodySVG muscleData={muscleData} onMuscleClick={handleMuscleClick} onHover={handleHover} />
                  </div>
                </div>
                
                {/* Selected Muscle Card - pushed to bottom */}
                {selectedMuscleData && (
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/30 max-w-[280px] mx-auto">
                    <h4 className="font-medium text-sm mb-2">Selected Muscle</h4>
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
                  </div>
                )}
              </div>

              {/* Right side: Video search & viewer */}
              <div className="flex-1 lg:w-1/2">
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">Exercise Videos</CardTitle>
                      <Button size="sm" onClick={searchVideos} disabled={isSearching}>
                        {isSearching ? 'Searching…' : 'Search video'}
                      </Button>
                    </div>
                    <CardDescription className="text-xs mt-1">
                      Results for {exerciseName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full bg-black rounded-md overflow-hidden mx-auto" style={{ aspectRatio: '9/16', maxWidth: '70%' }}>
                      {videoUrls.length === 0 ? (
                        <div className="x1ey2m1c x9f619 xtijo5x x1o0tod x10l6tqk x13vifvy x1ypdohk" role="presentation" style={{ width: '100%', height: '100%' }}>
                          <div className="xbudbmw x9uk3rv xa2bojp x10l6tqk xwa60dl" style={{ width: '100%', height: '100%' }}>
                            <div className="x1yomw13 x1dhbnvk x4iexvp xfem2s5 xv2xd2s xg79w0" style={{ width: '100%', height: '100%' }}></div>
                          </div>
                        </div>
                      ) : (
                        <div className="x5yr21d x10l6tqk x13vifvy xh8yej3" data-visualcompletion="ignore" style={{ width: '100%', height: '100%', position: 'relative' }}>
                          <img 
                            className="x15mokao x1ga7v0g x16uus16 xbiv7yw x5yr21d xl1xv1r xh8yej3" 
                            alt="" 
                            referrerPolicy="origin-when-cross-origin" 
                            src="https://scontent.cdninstagram.com/v/t51.82787-15/534315472_18285042016282299_6602308732763501482_n.jpg?stp=dst-jpg_e15_tt6&amp;_nc_cat=105&amp;ig_cache_key=MzcwMTM0ODIxNDkzNDA1NzYzNjE4Mjg1MDQyMDEwMjgyMjk5.3-ccb1-7&amp;ccb=1-7&amp;_nc_sid=58cdad&amp;efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjU0MHg5NjAuc2RyLkMzIn0%3D&amp;_nc_ohc=l1J7rOTpbMcQ7kNvwGBi9cg&amp;_nc_oc=AdmiK1B8wvtSLVdff9ZFTmjdk9e0MrJ84mTuXWjKjcpOchQjpeM9pJp3H7YeDcjxtuA&amp;_nc_ad=z-m&amp;_nc_cid=0&amp;_nc_zt=23&amp;_nc_ht=scontent.cdninstagram.com&amp;_nc_gid=N8FldTjgfFtNH-oJvKslCg&amp;oh=00_AfXEBcsDB2xIcfNtsZY6IQvyKDQQl0-W8W-cToGXh6Izww&amp;oe=68A91E08"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div className="x1ey2m1c x9f619 xtijo5x x1o0tod x10l6tqk x13vifvy x1ypdohk" role="presentation" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                            <div className="xbudbmw x9uk3rv xa2bojp x10l6tqk xwa60dl" style={{ width: '100%', height: '100%' }}>
                              <div className="x1yomw13 x1dhbnvk x4iexvp xfem2s5 xv2xd2s xg79w0" style={{ width: '100%', height: '100%' }}></div>
                            </div>
                          </div>
                          <div className="html-div xdj266r x14z9mp xat24cr x1lziwak xexx8yu xyri2b x18d9i69 x1c1uobl x9f619 xjbqb8w x78zum5 x15mokao x1ga7v0g x16uus16 xbiv7yw x10l6tqk x1ey2m1c xtijo5x x1plvlek xryxfnj x1c4vz4f x2lah0s xdt5ytf xqjyukv x1qjc9v5 x1oa3qoh x1nhvcw1" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                            <button aria-label="Toggle audio" className=" _aswp _aswq _aswu _asw_ _asx2" type="button" style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              <div className="html-div x9f619 x78zum5 x1c9tyrk xeusxvb x1pahc9y x1ertn4p x14vqqas xbmvrgn xod5an3 x1diwwjn x1y1aw1k xf159sx xwib8y2 xmzvs34 x1uhb9sk x1plvlek xryxfnj x1c4vz4f x2lah0s xdt5ytf xqjyukv x1qjc9v5 x1oa3qoh x1nhvcw1 x18l40ae">
                                <svg aria-label="Audio is muted" className="x1lliihq x1n2onr6 x9bdzbf" fill="currentColor" height="12" role="img" viewBox="0 0 48 48" width="12" style={{ color: 'white' }}>
                                  <title>Audio is muted</title>
                                  <path clipRule="evenodd" d="M1.5 13.3c-.8 0-1.5.7-1.5 1.5v18.4c0 .8.7 1.5 1.5 1.5h8.7l12.9 12.9c.9.9 2.5.3 2.5-1v-9.8c0-.4-.2-.8-.4-1.1l-22-22c-.3-.3-.7-.4-1.1-.4h-.6zm46.8 31.4-5.5-5.5C44.9 36.6 48 31.4 48 24c0-11.4-7.2-17.4-7.2-17.4-.6-.6-1.6-.6-2.2 0L37.2 8c-.6.6-.6 1.6 0 2.2 0 0 5.7 5 5.7 13.8 0 5.4-2.1 9.3-3.8 11.6L35.5 32c1.1-1.7 2.3-4.4 2.3-8 0-6.8-4.1-10.3-4.1-10.3-.6-.6-1.6-.6-2.2 0l-1.4 1.4c-.6.6-.6 1.6 0 2.2 0 0 2.6 2 2.6 6.7 0 1.8-.4 3.2-.9 4.3L25.5 22V1.4c0-1.3-1.6-1.9-2.5-1L13.5 10 3.3-.3c-.6-.6-1.5-.6-2.1 0L-.2 1.1c-.6.6-.6 1.5 0 2.1L4 7.6l26.8 26.8 13.9 13.9c.6.6 1.5.6 2.1 0l1.4-1.4c.7-.6.7-1.6.1-2.2z" fillRule="evenodd"></path>
                                </svg>
                              </div>
                            </button>
                          </div>
                          <div className="xwepwai x12ol6y4 x180vkcf x1khw62d x709u02 x972fbf x10w94by x1qhh985 x14e42zd x1ypdohk x14vqqas xbmvrgn xod5an3 x1diwwjn x13dflua x19991ni x1ey2m1c x1o0tod x10l6tqk x1hc1fzr" style={{ position: 'absolute', bottom: '10px', right: '10px' }}>
                            <button className=" _aswp _aswq _aswu _asw_ _asx2" type="button" style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              <div className="html-div xdj266r x14z9mp xat24cr x1lziwak x9f619 xjbqb8w x78zum5 x15mokao x1ga7v0g x16uus16 xbiv7yw xf159sx xmzvs34 xwib8y2 x1y1aw1k x1n2onr6 x1plvlek xryxfnj x1c4vz4f x2lah0s x1q0g3np xqjyukv x6s0dn4 x1oa3qoh xl56j7k">
                                <svg aria-label="Tags" className="x1lliihq x1n2onr6 x9bdzbf" fill="currentColor" height="12" role="img" viewBox="0 0 24 24" width="12" style={{ color: 'white' }}>
                                  <title>Tags</title>
                                  <path d="M21.334 23H2.666a1 1 0 0 1-1-1v-1.354a6.279 6.279 0 0 1 6.272-6.272h8.124a6.279 6.279 0 0 1 6.271 6.271V22a1 1 0 0 1-1 1ZM12 13.269a6 6 0 1 1 6-6 6.007 6.007 0 0 1-6 6Z"></path>
                                </svg>
                              </div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Button variant="outline" size="sm" onClick={prevVideo} disabled={videoUrls.length <= 1}>
                        Previous
                      </Button>
                      <div className="text-xs text-muted-foreground">
                        {videoUrls.length > 0 ? `${videoIndex + 1} / ${videoUrls.length}` : '—'}
                      </div>
                      <Button variant="outline" size="sm" onClick={nextVideo} disabled={videoUrls.length <= 1}>
                        Next
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="back" className="mt-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left side: Body vector and selected muscle stacked */}
              <div className="flex flex-col gap-4 lg:w-1/2 lg:justify-between">
                {/* Body Highlighter */}
                <div className="flex justify-center">
                  <div className="max-w-[280px] w-full">
                    <BackBodySVG muscleData={muscleData} onMuscleClick={handleMuscleClick} onHover={handleHover} />
                  </div>
                </div>

                {/* Selected Muscle Card - pushed to bottom */}
                {selectedMuscleData && (
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/30 max-w-[280px] mx-auto">
                    <h4 className="font-medium text-sm mb-2">Selected Muscle</h4>
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
                  </div>
                )}
              </div>

              {/* Right side: Video search & viewer */}
              <div className="flex-1 lg:w-1/2">
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">Exercise Videos</CardTitle>
                      <Button size="sm" onClick={searchVideos} disabled={isSearching}>
                        {isSearching ? 'Searching…' : 'Search video'}
                      </Button>
                    </div>
                    <CardDescription className="text-xs mt-1">
                      Results for {exerciseName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full bg-black rounded-md overflow-hidden mx-auto" style={{ aspectRatio: '9/16', maxWidth: '70%' }}>
                      {videoUrls.length === 0 ? (
                        <div className="x1ey2m1c x9f619 xtijo5x x1o0tod x10l6tqk x13vifvy x1ypdohk" role="presentation" style={{ width: '100%', height: '100%' }}>
                          <div className="xbudbmw x9uk3rv xa2bojp x10l6tqk xwa60dl" style={{ width: '100%', height: '100%' }}>
                            <div className="x1yomw13 x1dhbnvk x4iexvp xfem2s5 xv2xd2s xg79w0" style={{ width: '100%', height: '100%' }}></div>
                          </div>
                        </div>
                      ) : (
                        <div className="x5yr21d x10l6tqk x13vifvy xh8yej3" data-visualcompletion="ignore" style={{ width: '100%', height: '100%', position: 'relative' }}>
                          <img 
                            className="x15mokao x1ga7v0g x16uus16 xbiv7yw x5yr21d xl1xv1r xh8yej3" 
                            alt="" 
                            referrerPolicy="origin-when-cross-origin" 
                            src="https://scontent.cdninstagram.com/v/t51.82787-15/534315472_18285042016282299_6602308732763501482_n.jpg?stp=dst-jpg_e15_tt6&amp;_nc_cat=105&amp;ig_cache_key=MzcwMTM0ODIxNDkzNDA1NzYzNjE4Mjg1MDQyMDEwMjgyMjk5.3-ccb1-7&amp;ccb=1-7&amp;_nc_sid=58cdad&amp;efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjU0MHg5NjAuc2RyLkMzIn0%3D&amp;_nc_ohc=l1J7rOTpbMcQ7kNvwGBi9cg&amp;_nc_oc=AdmiK1B8wvtSLVdff9ZFTmjdk9e0MrJ84mTuXWjKjcpOchQjpeM9pJp3H7YeDcjxtuA&amp;_nc_ad=z-m&amp;_nc_cid=0&amp;_nc_zt=23&amp;_nc_ht=scontent.cdninstagram.com&amp;_nc_gid=N8FldTjgfFtNH-oJvKslCg&amp;oh=00_AfXEBcsDB2xIcfNtsZY6IQvyKDQQl0-W8W-cToGXh6Izww&amp;oe=68A91E08"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div className="x1ey2m1c x9f619 xtijo5x x1o0tod x10l6tqk x13vifvy x1ypdohk" role="presentation" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                            <div className="xbudbmw x9uk3rv xa2bojp x10l6tqk xwa60dl" style={{ width: '100%', height: '100%' }}>
                              <div className="x1yomw13 x1dhbnvk x4iexvp xfem2s5 xv2xd2s xg79w0" style={{ width: '100%', height: '100%' }}></div>
                            </div>
                          </div>
                          <div className="html-div xdj266r x14z9mp xat24cr x1lziwak xexx8yu xyri2b x18d9i69 x1c1uobl x9f619 xjbqb8w x78zum5 x15mokao x1ga7v0g x16uus16 xbiv7yw x10l6tqk x1ey2m1c xtijo5x x1plvlek xryxfnj x1c4vz4f x2lah0s xdt5ytf xqjyukv x1qjc9v5 x1oa3qoh x1nhvcw1" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                            <button aria-label="Toggle audio" className=" _aswp _aswq _aswu _asw_ _asx2" type="button" style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              <div className="html-div x9f619 x78zum5 x1c9tyrk xeusxvb x1pahc9y x1ertn4p x14vqqas xbmvrgn xod5an3 x1diwwjn x1y1aw1k xf159sx xwib8y2 xmzvs34 x1uhb9sk x1plvlek xryxfnj x1c4vz4f x2lah0s xdt5ytf xqjyukv x1qjc9v5 x1oa3qoh x1nhvcw1 x18l40ae">
                                <svg aria-label="Audio is muted" className="x1lliihq x1n2onr6 x9bdzbf" fill="currentColor" height="12" role="img" viewBox="0 0 48 48" width="12" style={{ color: 'white' }}>
                                  <title>Audio is muted</title>
                                  <path clipRule="evenodd" d="M1.5 13.3c-.8 0-1.5.7-1.5 1.5v18.4c0 .8.7 1.5 1.5 1.5h8.7l12.9 12.9c.9.9 2.5.3 2.5-1v-9.8c0-.4-.2-.8-.4-1.1l-22-22c-.3-.3-.7-.4-1.1-.4h-.6zm46.8 31.4-5.5-5.5C44.9 36.6 48 31.4 48 24c0-11.4-7.2-17.4-7.2-17.4-.6-.6-1.6-.6-2.2 0L37.2 8c-.6.6-.6 1.6 0 2.2 0 0 5.7 5 5.7 13.8 0 5.4-2.1 9.3-3.8 11.6L35.5 32c1.1-1.7 2.3-4.4 2.3-8 0-6.8-4.1-10.3-4.1-10.3-.6-.6-1.6-.6-2.2 0l-1.4 1.4c-.6.6-.6 1.6 0 2.2 0 0 2.6 2 2.6 6.7 0 1.8-.4 3.2-.9 4.3L25.5 22V1.4c0-1.3-1.6-1.9-2.5-1L13.5 10 3.3-.3c-.6-.6-1.5-.6-2.1 0L-.2 1.1c-.6.6-.6 1.5 0 2.1L4 7.6l26.8 26.8 13.9 13.9c.6.6 1.5.6 2.1 0l1.4-1.4c.7-.6.7-1.6.1-2.2z" fillRule="evenodd"></path>
                                </svg>
                              </div>
                            </button>
                          </div>
                          <div className="xwepwai x12ol6y4 x180vkcf x1khw62d x709u02 x972fbf x10w94by x1qhh985 x14e42zd x1ypdohk x14vqqas xbmvrgn xod5an3 x1diwwjn x13dflua x19991ni x1ey2m1c x1o0tod x10l6tqk x1hc1fzr" style={{ position: 'absolute', bottom: '10px', right: '10px' }}>
                            <button className=" _aswp _aswq _aswu _asw_ _asx2" type="button" style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              <div className="html-div xdj266r x14z9mp xat24cr x1lziwak x9f619 xjbqb8w x78zum5 x15mokao x1ga7v0g x16uus16 xbiv7yw xf159sx xmzvs34 xwib8y2 x1y1aw1k x1n2onr6 x1plvlek xryxfnj x1c4vz4f x2lah0s x1q0g3np xqjyukv x6s0dn4 x1oa3qoh xl56j7k">
                                <svg aria-label="Tags" className="x1lliihq x1n2onr6 x9bdzbf" fill="currentColor" height="12" role="img" viewBox="0 0 24 24" width="12" style={{ color: 'white' }}>
                                  <title>Tags</title>
                                  <path d="M21.334 23H2.666a1 1 0 0 1-1-1v-1.354a6.279 6.279 0 0 1 6.272-6.272h8.124a6.279 6.279 0 0 1 6.271 6.271V22a1 1 0 0 1-1 1ZM12 13.269a6 6 0 1 1 6-6 6.007 6.007 0 0 1-6 6Z"></path>
                                </svg>
                              </div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Button variant="outline" size="sm" onClick={prevVideo} disabled={videoUrls.length <= 1}>
                        Previous
                      </Button>
                      <div className="text-xs text-muted-foreground">
                        {videoUrls.length > 0 ? `${videoIndex + 1} / ${videoUrls.length}` : '—'}
                      </div>
                      <Button variant="outline" size="sm" onClick={nextVideo} disabled={videoUrls.length <= 1}>
                        Next
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Legend */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border/30">
            <div className="text-sm font-medium mb-3 text-foreground">Muscle Intensity Scale</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(0 100% 50%)' }} />
                <span className="text-muted-foreground">Very High (4.5+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(0 85% 60%)' }} />
                <span className="text-muted-foreground">High (4+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(30 85% 50%)' }} />
                <span className="text-muted-foreground">Med-High (3+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(60 75% 50%)' }} />
                <span className="text-muted-foreground">Medium (2+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(120 60% 45%)' }} />
                <span className="text-muted-foreground">Low+ (1.5+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(200 60% 60%)' }} />
                <span className="text-muted-foreground">Low (1+)</span>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              💡 Higher intensity muscles show with brighter colors and glow effects
            </div>
          </div>
        </Tabs>
        </CardHeader>
      </CardContent>
    </Card>
    </TooltipProvider>
  )
}

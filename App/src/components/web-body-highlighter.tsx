import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState, useRef, useEffect } from 'react'
import { Dumbbell, Lock } from 'lucide-react'
import { ExerciseDropdown } from "@/app/fitness-calculator/ExerciseDropdown"
import { Button } from "@/components/ui/button"
import { useUserTier } from "@/hooks/use-user-tier"

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

export function WebBodyHighlighter({ muscleGroups, exerciseName, selectedExerciseId, setSelectedExerciseId, isLoadingExercises, exerciseLoadError }: WebBodyHighlighterProps) {
  const [side, setSide] = useState<'front' | 'back'>('front')
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const { isPaidTier } = useUserTier()

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

  // Enhanced video carousel with animations
  const [isSearching, setIsSearching] = useState(false)
  const [videoUrls, setVideoUrls] = useState<string[]>([])
  const [videoError, setVideoError] = useState<
    | { code: 'missing_api_key' | 'quota_exceeded' | 'upstream_error' | 'no_results' | 'no_queries'; message: string }
    | null
  >(null)
  const [videoIndex, setVideoIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  // No placeholder; show status cards instead

  const extractYouTubeId = (url: string): string | null => {
    try {
      // Handle youtu.be short links
      const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/)
      if (shortMatch && shortMatch[1]) return shortMatch[1]

      // Handle youtube.com/watch?v=
      const watchMatch = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/)
      if (watchMatch && watchMatch[1]) return watchMatch[1]

      // Handle youtube.com/shorts/
      const shortsMatch = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/)
      if (shortsMatch && shortsMatch[1]) return shortsMatch[1]
    } catch {
      // ignore parsing errors
    }
    return null
  }

  const toYouTubeEmbedUrl = (url: string): string | null => {
    const id = extractYouTubeId(url)
    if (!id) return null
    return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`
  }

  const toYouTubeThumbnailUrl = (url: string): string | null => {
    const id = extractYouTubeId(url)
    if (!id) return null
    // Use high-quality default; falls back automatically if not available
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
  }

  const searchVideos = async () => {
    // Check if user has access to video search
    if (!isPaidTier) {
      return
    }

    setIsSearching(true)
    setVideoError(null)
    setVideoUrls([])
    try {
      // Use the new YouTube API endpoint
      const response = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          exerciseId: selectedExerciseId,
          exerciseName: exerciseName 
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (response.ok && data.videos && Array.isArray(data.videos)) {
        setVideoUrls(data.videos)
        setVideoIndex(0)
        return
      }
      // non-OK responses
      setVideoError({ code: data.error || 'upstream_error', message: data.message || 'Video search failed. Try again later.' })
    } catch (error) {
      console.error('Video search error:', error)
      setVideoError({ code: 'upstream_error', message: 'Video search failed. Try again later.' })
    } finally {
      setIsSearching(false)
    }
  }

  const nextVideo = () => {
    if (videoUrls.length <= 1 || isTransitioning) return
    setIsTransitioning(true)
    setSlideDirection('left')
    
    setTimeout(() => {
      setVideoIndex((i) => (i + 1) % videoUrls.length)
      setIsTransitioning(false)
      setSlideDirection(null)
    }, 300)
  }

  const prevVideo = () => {
    if (videoUrls.length <= 1 || isTransitioning) return
    setIsTransitioning(true)
    setSlideDirection('right')
    
    setTimeout(() => {
      setVideoIndex((i) => (i - 1 + videoUrls.length) % videoUrls.length)
      setIsTransitioning(false)
      setSlideDirection(null)
    }, 300)
  }

  // Reset transition state when videoUrls change
  useEffect(() => {
    setIsTransitioning(false)
    setSlideDirection(null)
  }, [videoUrls])

  // Simple video search/render panel
  return (
    <TooltipProvider>
      <Card className="bg-card/50 backdrop-blur border-border/50 h-full">
        <CardContent className="p-6 h-full">
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
                    <ExerciseDropdown
                      selectedExerciseId={selectedExerciseId}
                      onSelectExercise={setSelectedExerciseId}
                      isLoading={Boolean(isLoadingExercises)}
                      error={exerciseLoadError ?? null}
                      align="start"
                      side="bottom"
                      sideOffset={6}
                      contentClassName="min-w-[300px]"
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

            {/* Right side: Exercise video container */}
            <div className="lg:w-1/2 flex flex-col">
              <div className="flex flex-col gap-4 flex-1">
                {/* Video Header Section */}
                <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm border-border/50">
                  <div className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 px-6 pt-0">
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
                    <CardDescription className="text-xs mt-1">
                      {isPaidTier ? `Results for ${exerciseName}` : `Upgrade to Personal or Trainer plan to search exercise videos`}
                    </CardDescription>
                  </div>
                </div>

                {/* Video Content Section */}
                <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm border-border/50 flex-1">
                  <div className="relative flex-1 flex flex-col px-6">
                    {!isPaidTier ? (
                      /* Upgrade prompt for free users */
                      <div className="flex items-center justify-center flex-1 min-h-[400px]">
                        <div className="text-center space-y-4 max-w-md">
                          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                            <Lock className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <h3 className="text-lg font-semibold">Exercise Videos Available with Upgrade</h3>
                          <p className="text-sm text-muted-foreground">
                            Get access to curated exercise tutorial videos from YouTube when you upgrade to Personal or Trainer plan.
                          </p>
                          <Button asChild className="mt-4">
                            <a href="/account?tab=billing#plans">Upgrade Now</a>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Enhanced Carousel container with smooth animations */}
                        <div className="relative flex items-center justify-center flex-1 overflow-hidden min-h-[400px]" ref={carouselRef}>
                      {/* Previous preview card - enhanced animations */}
                      {videoUrls.length > 1 && (
                        <div 
                          className={`absolute bg-black rounded-md overflow-hidden cursor-pointer transition-all duration-500 ease-out ${
                            isTransitioning && slideDirection === 'right' 
                              ? 'opacity-80 scale-110' 
                              : 'opacity-40 hover:opacity-60 hover:scale-105'
                          }`}
                          style={{ 
                            aspectRatio: '9/16',
                            width: 'clamp(120px, 15vw, 200px)',
                            height: 'clamp(210px, 26.25vw, 350px)',
                            left: '15%',
                            zIndex: 1,
                            transform: `translateX(-50%) scale(${isTransitioning && slideDirection === 'right' ? 1.1 : 0.9})`,
                            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          onClick={prevVideo}
                        >
                          {(() => {
                            const prevIdx = (videoIndex - 1 + videoUrls.length) % videoUrls.length
                            const thumb = toYouTubeThumbnailUrl(videoUrls[prevIdx])
                            if (!thumb) {
                              return <div className="w-full h-full bg-muted/20" />
                            }
                            return (
                              <div className="w-full h-full relative">
                                <img src={thumb} alt="Previous video preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
                              </div>
                            )
                          })()}
                        </div>
                      )}
                      
                      {/* Next preview card - enhanced animations */}
                      {videoUrls.length > 1 && (
                        <div 
                          className={`absolute bg-black rounded-md overflow-hidden cursor-pointer transition-all duration-500 ease-out ${
                            isTransitioning && slideDirection === 'left' 
                              ? 'opacity-80 scale-110' 
                              : 'opacity-40 hover:opacity-60 hover:scale-105'
                          }`}
                          style={{ 
                            aspectRatio: '9/16',
                            width: 'clamp(120px, 15vw, 200px)',
                            height: 'clamp(210px, 26.25vw, 350px)',
                            right: '15%',
                            zIndex: 1,
                            transform: `translateX(50%) scale(${isTransitioning && slideDirection === 'left' ? 1.1 : 0.9})`,
                            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          onClick={nextVideo}
                        >
                          {(() => {
                            const nextIdx = (videoIndex + 1) % videoUrls.length
                            const thumb = toYouTubeThumbnailUrl(videoUrls[nextIdx])
                            if (!thumb) {
                              return <div className="w-full h-full bg-muted/20" />
                            }
                            return (
                              <div className="w-full h-full relative">
                                <img src={thumb} alt="Next video preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
                              </div>
                            )
                          })()}
                        </div>
                      )}
                      
                      {/* Main video card - enhanced with slide animations */}
                      <div 
                        className={`relative bg-black rounded-md overflow-hidden transition-all duration-500 ease-out ${
                          isTransitioning ? 'pointer-events-none' : ''
                        }`}
                        style={{ 
                          aspectRatio: '9/16', 
                          maxWidth: 'clamp(200px, 60%, 400px)',
                          zIndex: 2,
                          transform: isTransitioning 
                            ? slideDirection === 'left' 
                              ? 'translateX(-100%) scale(0.9)' 
                              : slideDirection === 'right' 
                                ? 'translateX(100%) scale(0.9)' 
                                : 'translateX(0) scale(1)'
                            : 'translateX(0) scale(1)',
                          opacity: isTransitioning ? 0.7 : 1,
                          filter: isTransitioning ? 'brightness(0%)' : 'brightness(100%)',
                          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        {videoUrls.length === 0 ? (
                          <div className="w-full h-full bg-muted/20 flex items-center justify-center">
                            <div className="text-center space-y-2 p-4">
                              {!videoError && !isSearching && (
                                <>
                                  <p className="text-sm text-muted-foreground">Start by clicking on the search button</p>
                                </>
                              )}
                              {videoError?.code === 'quota_exceeded' && (
                                <p className="text-sm text-muted-foreground">Search limit reached (try again tomorrow)</p>
                              )}
                              {videoError && videoError.code !== 'quota_exceeded' && (
                                <p className="text-sm text-muted-foreground">{videoError.message || 'Try again later'}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          (() => {
                            const embedUrl = toYouTubeEmbedUrl(videoUrls[videoIndex])
                            if (!embedUrl) {
                              return (
                                <div className="w-full h-full bg-muted/20" />
                              )
                            }
                            return (
                              <iframe
                                src={embedUrl}
                                title="YouTube video player"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                frameBorder={0}
                                style={{ width: '100%', height: '100%' }}
                              />
                            )
                          })()
                        )}
                      </div>
                    </div>
                    
                    {/* Enhanced navigation buttons with animations */}
                    <div className="mt-3 flex items-center justify-between">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={prevVideo} 
                        disabled={videoUrls.length <= 1 || isTransitioning}
                        className="transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </Button>
                      <div className="text-xs text-muted-foreground transition-opacity duration-200">
                        {videoUrls.length > 0 ? `${videoIndex + 1} / ${videoUrls.length}` : '—'}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={nextVideo} 
                        disabled={videoUrls.length <= 1 || isTransitioning}
                        className="transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

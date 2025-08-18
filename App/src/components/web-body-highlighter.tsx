import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState } from 'react'
import { Eye, Dumbbell } from 'lucide-react'

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
}: {
  Component: React.FC<React.SVGProps<SVGSVGElement>>
  color: string
  involvement: number
  onClick: () => void
  placement: LayerPlacement
  title: string
  forceFillChildren?: boolean
}) => {
  return (
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
      title={title}
      data-involvement={involvement}
    >
      <Component
        style={{ fill: color }}
        className="w-full h-auto"
        aria-label={title}
        focusable={false}
      />
    </div>
  )
}

// Front view body component (layered from individual SVG exports)
const FrontBodySVG = ({ muscleData, onMuscleClick }: {
  muscleData: { [key: string]: { color: string; involvement: number } },
  onMuscleClick: (muscle: string) => void
}) => {
  // Placement map relative to a 327x652 frame, expressed in percentages
  const placements: Record<string, LayerPlacement> = {
    head: { topPct: -4, leftPct: 41, widthPct: 50 },
    neck: { topPct: 7.5, leftPct: 45.8, widthPct: 100 },
    trapezius: { topPct: 11, leftPct: 34.5, widthPct: 44 },
    hands: { topPct: 47, leftPct: -5.2, widthPct: 121 },
    deltoids: { topPct: 15, leftPct: 19, widthPct: 99 },
    chest: { topPct: 16.7, leftPct: 30, widthPct: 99 },
    biceps: { topPct: 23.4, leftPct: 16, widthPct: 99 },
    abs: { topPct: 24, leftPct: 42, widthPct: 99 },
    obliques: { topPct: 16, leftPct: 31, widthPct: 99 },
    forearms: { topPct: 33.5, leftPct: 5.5, widthPct: 99 },
    quads: { topPct: 44, leftPct: 28, widthPct: 99 },
    calves: { topPct: 68, leftPct: 21.5, widthPct: 99 }, // using Lower Legs for front calves
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
      />
    </div>
  )
}

// Back view body component (layered SVGs)
const BackBodySVG = ({ muscleData, onMuscleClick }: {
  muscleData: { [key: string]: { color: string; involvement: number } },
  onMuscleClick: (muscle: string) => void
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
      />

    </div>
  )
}

export function WebBodyHighlighter({ muscleGroups, exerciseName }: WebBodyHighlighterProps) {
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



  const selectedMuscleData = selectedMuscle ? muscleGroups.find(m => m.name === selectedMuscle) : null

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardContent className="p-6">
        <CardHeader className="px-0 pt-0">
        <div className="flex items-center space-x-2 mb-4">
          <Dumbbell className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-semibold">Muscle Involvement</CardTitle>
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
              {/* Body Highlighter */}
              <div className="flex-1 flex justify-center">
                <div className="max-w-[280px] w-full">
                  <FrontBodySVG muscleData={muscleData} onMuscleClick={handleMuscleClick} />
                </div>
              </div>
              
              {/* Muscle Details Sidebar */}
              <div className="flex-1 space-y-4">
                {selectedMuscleData && (
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/30">
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

                {/* Muscle List for front view */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-foreground">
                    Active Muscles (Front View)
                  </h4>
                  {muscleGroups.filter(muscle => {
                    const bodyPart = muscleToBodyPartMap[muscle.name]
                    return !bodyPart?.side || bodyPart.side === 'front'
                  }).map((muscle, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedMuscle === muscle.name 
                          ? 'bg-primary/10 border border-primary/20' 
                          : 'bg-muted/20 hover:bg-muted/30'
                      }`}
                      onClick={() => handleMuscleClick(muscle.name)}
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getInvolvementColor(muscle.involvement) }}
                        />
                        <span className="text-sm font-medium">{muscle.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {muscle.percentage.toFixed(1)}%
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Level {muscle.involvement}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="back" className="mt-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Body Highlighter */}
              <div className="flex-1 flex justify-center">
                <div className="max-w-[280px] w-full">
                  <BackBodySVG muscleData={muscleData} onMuscleClick={handleMuscleClick} />
                </div>
              </div>

              {/* Muscle Details Sidebar */}
              <div className="flex-1 space-y-4">
                {selectedMuscleData && (
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/30">
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

                {/* Muscle List for back view */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-foreground">
                    Active Muscles (Back View)
                  </h4>
                  {muscleGroups.filter(muscle => {
                    const bodyPart = muscleToBodyPartMap[muscle.name]
                    return !bodyPart?.side || bodyPart.side === 'back'
                  }).map((muscle, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedMuscle === muscle.name 
                          ? 'bg-primary/10 border border-primary/20' 
                          : 'bg-muted/20 hover:bg-muted/30'
                      }`}
                      onClick={() => handleMuscleClick(muscle.name)}
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getInvolvementColor(muscle.involvement) }}
                        />
                        <span className="text-sm font-medium">{muscle.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {muscle.percentage.toFixed(1)}%
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Level {muscle.involvement}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
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
  )
}

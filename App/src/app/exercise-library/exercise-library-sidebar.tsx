"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Filter, Dumbbell, Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Clock } from "lucide-react"

interface ExerciseLibrarySidebarProps {
  collapsed: boolean
  searchTerm: string
  setSearchTerm: (value: string) => void
  spaces: Array<{ id: string; name: string }>
  selectedSpaceId: string
  setSelectedSpaceId: (value: string) => void
  workoutTypes: string[]
  selectedWorkoutType: string
  setSelectedWorkoutType: (value: string) => void
  muscleGroups: string[]
  selectedMuscleGroup: string
  setSelectedMuscleGroup: (value: string) => void
  isPaidTier: boolean
  lastSyncTime: Date | null
  syncStatus: 'idle' | 'syncing' | 'success' | 'error'
  onManualSync?: () => void
}

export function ExerciseLibrarySidebar({
  collapsed,
  searchTerm,
  setSearchTerm,
  spaces,
  selectedSpaceId,
  setSelectedSpaceId,
  workoutTypes,
  selectedWorkoutType,
  setSelectedWorkoutType,
  muscleGroups,
  selectedMuscleGroup,
  setSelectedMuscleGroup,
  isPaidTier,
  lastSyncTime,
  syncStatus,
  onManualSync,
}: ExerciseLibrarySidebarProps) {
  const formatSyncTime = (date: Date | null) => {
    if (!date) return 'Never'
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    
    if (diffSeconds < 60) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="h-3 w-3 animate-spin" />
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-600" />
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-600" />
      default:
        return <Cloud className="h-3 w-3" />
    }
  }

  const getSyncStatus = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...'
      case 'success':
        return 'Synced'
      case 'error':
        return 'Sync failed'
      default:
        return 'Ready'
    }
  }
  return (
    <div
      className={[
        collapsed
          ? 'hidden'
          : 'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-lg lg:sticky lg:top-0 lg:self-start lg:w-56 lg:max-w-none',
        'border-r bg-background flex flex-col h-full lg:h-screen transition-all p-6'
      ].join(' ')}
    >
      <div className="p-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-6 w-6 text-primary" />
            {!collapsed && (
              <h2 className="text-sm font-semibold">Exercise Filters</h2>
            )}
          </div>
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-auto">
          <div className="p-0 space-y-5">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Search</Label>
              <Input
                placeholder="Search exercises..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>

            <Separator className="my-1" />

            <div className="space-y-3">
              <Label className="text-sm font-medium">Workout Space</Label>
              <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
                <SelectTrigger className="w-full h-9 bg-background border-border hover:bg-accent hover:text-accent-foreground transition-colors">
                  <SelectValue placeholder="All Spaces" />
                </SelectTrigger>
                <SelectContent className="w-full max-h-64">
                  {spaces.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="cursor-pointer">
                      <div className="flex items-center justify-between w-full">
                        <span>{s.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Workout Type</Label>
              <Select value={selectedWorkoutType} onValueChange={setSelectedWorkoutType}>
                <SelectTrigger className="w-full h-9 bg-background border-border hover:bg-accent hover:text-accent-foreground transition-colors">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="w-full max-h-64">
                  <SelectItem value="all" className="cursor-pointer">All</SelectItem>
                  {workoutTypes.map((type) => (
                    <SelectItem key={type} value={type} className="cursor-pointer">
                      <div className="flex items-center justify-between w-full">
                        <span>{type}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Muscle Group</Label>
              <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                <SelectTrigger className="w-full h-9 bg-background border-border hover:bg-accent hover:text-accent-foreground transition-colors">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="w-full max-h-64">
                  <SelectItem value="all" className="cursor-pointer">All</SelectItem>
                  {muscleGroups.map((group) => (
                    <SelectItem key={group} value={group} className="cursor-pointer">
                      <div className="flex items-center justify-between w-full">
                        <span>{group}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-1" />

            {isPaidTier && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sync Status</Label>
                  <div className="p-3 rounded-md bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSyncIcon()}
                        <span className="text-xs font-medium">{getSyncStatus()}</span>
                      </div>
                      {onManualSync && syncStatus !== 'syncing' && (
                        <button
                          onClick={onManualSync}
                          className="p-1 hover:bg-background rounded transition-colors"
                          title="Manual sync"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Last sync: {formatSyncTime(lastSyncTime)}</span>
                    </div>
                  </div>
                </div>
                <Separator className="my-1" />
              </div>
            )}

            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-3.5 w-3.5" />
                <span>Filters apply instantly</span>
              </div>
              {!isPaidTier && (
                <div className="flex items-center gap-2">
                  <CloudOff className="h-3.5 w-3.5" />
                  <span>Local storage only</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



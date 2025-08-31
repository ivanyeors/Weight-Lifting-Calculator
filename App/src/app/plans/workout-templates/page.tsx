"use client"

import { useState, useEffect, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { WorkoutTemplatesSidebar } from './workout-templates-sidebar'
import { WorkoutTemplateCard } from './workout-template-card'
import { CreateTemplateDrawer } from './create-template-drawer'
import { EditTemplateDrawer } from './edit-template-drawer'
import { useSelectedUser } from '@/hooks/use-selected-user'
import { useUserTier } from '@/hooks/use-user-tier'
import { PanelLeft, PanelRight, Plus } from "lucide-react"
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'

type SyncState = 'idle' | 'syncing' | 'success' | 'error'

interface ExerciseConfig {
  exerciseId: string
  sets: number
  reps: number
  restTime?: number
}

interface WorkoutTemplate {
  id: string
  name: string
  workoutSpaceId: string
  workoutSpaceName: string
  exercises: ExerciseConfig[]
  estimatedCalories: number
  estimatedTime: number
  usageCount: number
  exerciseCount: number
}

export default function WorkoutTemplatesPage() {
  const { user: selectedUser } = useSelectedUser()
  const { userId } = useUserTier()
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncState>('idle')
  
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null)

  // Load templates from Supabase
  const loadTemplates = async () => {
    if (!userId) return
    setSyncStatus('syncing')
    setLoading(true)
    try {
      // Load workout spaces for name mapping
      const { data: spacesData } = await supabase
        .from('workout_spaces')
        .select('id, name')
      const spaceMap = new Map<string, string>((spacesData ?? []).map((s: any) => [s.id as string, (s.name as string) ?? '']))

      type DbTemplate = {
        id: string
        name: string
        workout_space_id: string | null
        exercises: Array<{ exerciseId: string; sets: number; reps: number; restTime?: number }> | null
        estimated_calories: number | null
        estimated_time: number | null
        usage_count: number | null
      }
      const { data, error } = await supabase
        .from('workout_templates')
        .select('id, name, workout_space_id, exercises, estimated_calories, estimated_time, usage_count')
        .order('updated_at', { ascending: false })
      if (error) throw error
      const rows = (data ?? []) as DbTemplate[]
      const mapped: WorkoutTemplate[] = rows.map((row) => ({
        id: row.id,
        name: row.name,
        workoutSpaceId: row.workout_space_id ?? '',
        workoutSpaceName: row.workout_space_id ? (spaceMap.get(row.workout_space_id) || row.workout_space_id) : '',
        exercises: (row.exercises ?? []).map((c) => ({ exerciseId: c.exerciseId, sets: c.sets, reps: c.reps, restTime: c.restTime })),
        estimatedCalories: row.estimated_calories ?? 0,
        estimatedTime: row.estimated_time ?? 0,
        usageCount: row.usage_count ?? 0,
        exerciseCount: (row.exercises ?? []).length,
      }))
      setTemplates(mapped)
      setSyncStatus('success')
    } catch (err) {
      console.error('Failed to load templates', err)
      toast.error('Failed to load workout templates')
      setSyncStatus('error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTemplates() }, [userId])

  // Filter templates based on search
  const filteredTemplates = useMemo(() => {
    if (!searchTerm) return templates
    const searchLower = searchTerm.toLowerCase()
    return templates.filter(template => 
      template.name.toLowerCase().includes(searchLower) ||
      template.workoutSpaceName.toLowerCase().includes(searchLower)
    )
  }, [templates, searchTerm])

  const handleSearch = () => {
    // Search is handled automatically via filteredTemplates
    toast.success(`Found ${filteredTemplates.length} templates`)
  }

  const handleReset = () => {
    setSearchTerm('')
    toast.success('Search reset')
  }

  const handleCreateTemplate = async (templateData: {
    name: string
    workoutSpaceId: string
    exercises: string[]
  }) => {
    try {
      setSyncStatus('syncing')
      const exerciseConfigs = templateData.exercises.map(id => ({ exerciseId: id, sets: 3, reps: 10 }))
      const estimatedTime = exerciseConfigs.reduce((sum, c) => sum + c.sets * 2, 0) + exerciseConfigs.length
      const estimatedCalories = Math.round(estimatedTime * 5)
      const { data, error } = await supabase
        .from('workout_templates')
        .insert({
          owner_id: (await supabase.auth.getUser()).data.user?.id,
          name: templateData.name,
          workout_space_id: templateData.workoutSpaceId || null,
          exercises: exerciseConfigs,
          estimated_calories: estimatedCalories,
          estimated_time: estimatedTime,
          usage_count: 0
        })
        .select('id')
        .single()
      if (error) throw error
      await loadTemplates()
      setSyncStatus('success')
      toast.success('Workout template created successfully!')
    } catch (err) {
      console.error('Create template failed', err)
      setSyncStatus('error')
      toast.error('Failed to create workout template')
    }
  }

  const handleEditTemplate = async (updatedTemplate: WorkoutTemplate) => {
    try {
      setSyncStatus('syncing')
      const { error } = await supabase
        .from('workout_templates')
        .update({
          name: updatedTemplate.name,
          workout_space_id: updatedTemplate.workoutSpaceId || null,
          exercises: updatedTemplate.exercises,
          estimated_calories: updatedTemplate.estimatedCalories,
          estimated_time: updatedTemplate.estimatedTime,
          usage_count: updatedTemplate.usageCount
        })
        .eq('id', updatedTemplate.id)
      if (error) throw error
      await loadTemplates()
      setSyncStatus('success')
      toast.success('Workout template updated successfully!')
    } catch (err) {
      console.error('Update template failed', err)
      setSyncStatus('error')
      toast.error('Failed to update workout template')
    }
  }

  const handleTemplateClick = (template: WorkoutTemplate) => {
    setEditingTemplate(template)
    setEditDrawerOpen(true)
  }

  return (
    <div className="flex h-screen">
      <WorkoutTemplatesSidebar
        collapsed={sidebarCollapsed}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSearch={handleSearch}
        onReset={handleReset}
        syncStatus={syncStatus}
        onRefresh={loadTemplates}
      />
      
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
          aria-hidden
        />
      )}

      <div className="flex-1 flex flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
          
          <div className="ml-auto flex items-center gap-3">
            <Button onClick={() => setCreateDrawerOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Workout Templates</h1>
            {selectedUser ? (
              <p className="text-muted-foreground">Using profile: <span className="font-medium">{selectedUser.name}</span></p>
            ) : (
              <p className="text-muted-foreground">Select a user in Users to personalize.</p>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading templates...</div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                {searchTerm ? 'No templates found matching your search.' : 'No workout templates yet.'}
              </div>
              {!searchTerm && (
                <Button onClick={() => setCreateDrawerOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Template
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <WorkoutTemplateCard
                  key={template.id}
                  template={template}
                  onClick={() => handleTemplateClick(template)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <CreateTemplateDrawer
        open={createDrawerOpen}
        onOpenChange={setCreateDrawerOpen}
        onSave={handleCreateTemplate}
      />

      <EditTemplateDrawer
        open={editDrawerOpen}
        template={editingTemplate}
        onOpenChange={setEditDrawerOpen}
        onSave={handleEditTemplate}
      />
    </div>
  )
}



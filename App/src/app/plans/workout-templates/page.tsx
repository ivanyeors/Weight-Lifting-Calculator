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
  
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null)

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      if (!userId) return
      
      setLoading(true)
      try {
        // For now, we'll use mock data since we haven't created the database table yet
        // In a real implementation, you'd fetch from a workout_templates table
        const mockTemplates: WorkoutTemplate[] = [
          {
            id: '1',
            name: 'Upper Body Strength',
            workoutSpaceId: 'gym',
            workoutSpaceName: 'Gym',
            exercises: [
              { exerciseId: 'bench-press', sets: 3, reps: 8 },
              { exerciseId: 'shoulder-press', sets: 3, reps: 10 },
              { exerciseId: 'pull-ups', sets: 3, reps: 8 }
            ],
            estimatedCalories: 180,
            estimatedTime: 45,
            usageCount: 5,
            exerciseCount: 3
          },
          {
            id: '2',
            name: 'Lower Body Power',
            workoutSpaceId: 'gym',
            workoutSpaceName: 'Gym',
            exercises: [
              { exerciseId: 'squats', sets: 4, reps: 6 },
              { exerciseId: 'deadlift', sets: 3, reps: 5 },
              { exerciseId: 'lunges', sets: 3, reps: 12 }
            ],
            estimatedCalories: 220,
            estimatedTime: 55,
            usageCount: 3,
            exerciseCount: 3
          },
          {
            id: '3',
            name: 'Home Workout',
            workoutSpaceId: 'home',
            workoutSpaceName: 'Home',
            exercises: [
              { exerciseId: 'push-ups', sets: 3, reps: 15 },
              { exerciseId: 'sit-ups', sets: 3, reps: 20 },
              { exerciseId: 'lunges', sets: 3, reps: 12 }
            ],
            estimatedCalories: 120,
            estimatedTime: 30,
            usageCount: 8,
            exerciseCount: 3
          }
        ]
        
        setTemplates(mockTemplates)
      } catch (err) {
        console.error('Failed to load templates', err)
        toast.error('Failed to load workout templates')
      } finally {
        setLoading(false)
      }
    }

    loadTemplates()
  }, [userId])

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

  const handleCreateTemplate = (templateData: {
    name: string
    workoutSpaceId: string
    exercises: string[]
  }) => {
    // In a real implementation, you'd save to the database
    const newTemplate: WorkoutTemplate = {
      id: Date.now().toString(),
      name: templateData.name,
      workoutSpaceId: templateData.workoutSpaceId,
      workoutSpaceName: 'Gym', // You'd get this from the workout spaces table
      exercises: templateData.exercises.map(exerciseId => ({
        exerciseId,
        sets: 3,
        reps: 10
      })),
      estimatedCalories: 150,
      estimatedTime: 40,
      usageCount: 0,
      exerciseCount: templateData.exercises.length
    }
    
    setTemplates(prev => [newTemplate, ...prev])
    toast.success('Workout template created successfully!')
  }

  const handleEditTemplate = (updatedTemplate: WorkoutTemplate) => {
    setTemplates(prev => 
      prev.map(template => 
        template.id === updatedTemplate.id ? updatedTemplate : template
      )
    )
    toast.success('Workout template updated successfully!')
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



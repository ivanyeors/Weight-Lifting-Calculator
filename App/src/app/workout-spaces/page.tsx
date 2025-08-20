"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
// removed Select dropdown for Manage Space display
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { useUserTier } from '@/hooks/use-user-tier'
import { RefreshCw, CheckCircle, AlertCircle, Cloud, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type SyncState = 'idle' | 'syncing' | 'success' | 'error'

interface SpaceItem { id: string; name: string }
interface EquipmentItem { id: string; name: string; category: string | null }

export default function WorkoutSpacesPage() {
  const { userId, isPaidTier } = useUserTier()

  const [syncStatus, setSyncStatus] = useState<SyncState>('idle')
  const [spaces, setSpaces] = useState<SpaceItem[]>([])
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('new')

  const [newSpaceName, setNewSpaceName] = useState<string>('')
  const [editSpaceName, setEditSpaceName] = useState<string>('')

  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<string>>(new Set())

  const selectedSpace = useMemo(() => spaces.find((s) => s.id === selectedSpaceId) || null, [spaces, selectedSpaceId])

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Cloud className="h-4 w-4" />
    }
  }

  useEffect(() => {
    const loadEquipment = async () => {
      try {
        const { data, error } = await supabase
          .from('equipment')
          .select('id, name, category')
          .order('name', { ascending: true })
        if (error) throw error
        setEquipment((data ?? []).map((r) => ({ id: r.id as string, name: r.name as string, category: (r.category as string | null) ?? null })))
      } catch (err) {
        console.error('Failed to load equipment', err)
        toast.error('Failed to load equipment')
      }
    }
    loadEquipment()
  }, [])

  useEffect(() => {
    const loadSpaces = async () => {
      try {
        if (!userId) return
        const { data, error } = await supabase
          .from('workout_spaces')
          .select('id, name')
          .order('name', { ascending: true })
        if (error) throw error
        const list = (data ?? []).map((r) => ({ id: r.id as string, name: r.name as string }))
        setSpaces(list)
        // keep selection consistent
        if (selectedSpaceId !== 'new') {
          const stillExists = list.some((s) => s.id === selectedSpaceId)
          if (!stillExists) setSelectedSpaceId('new')
        }
      } catch (err) {
        console.error('Failed to load spaces', err)
        toast.error('Failed to load spaces')
      }
    }
    loadSpaces()
  }, [userId])

  useEffect(() => {
    const loadSpaceDetails = async () => {
      try {
        if (!selectedSpaceId || selectedSpaceId === 'new') {
          setEditSpaceName('')
          setSelectedEquipmentIds(new Set())
          return
        }
        setEditSpaceName(selectedSpace?.name ?? '')
        const { data, error } = await supabase
          .from('space_equipment')
          .select('equipment_id')
          .eq('space_id', selectedSpaceId)
        if (error) throw error
        const ids = new Set<string>((data ?? []).map((r: any) => r.equipment_id as string))
        setSelectedEquipmentIds(ids)
      } catch (err) {
        console.error('Failed to load space equipment', err)
        toast.error('Failed to load space equipment')
      }
    }
    loadSpaceDetails()
  }, [selectedSpaceId, selectedSpace])

  const handleCreateSpace = async () => {
    try {
      if (!userId) {
        toast.error('Please sign in to create spaces')
        return
      }
      const name = newSpaceName.trim()
      if (!name) {
        toast.error('Enter a space name')
        return
      }
      setSyncStatus('syncing')
      const { data, error } = await supabase
        .from('workout_spaces')
        .insert({ user_id: userId, name })
        .select('id, name')
        .single()
      if (error) throw error
      setSpaces((prev) => [...prev, { id: data!.id as string, name: data!.name as string }].sort((a,b)=>a.name.localeCompare(b.name)))
      setSelectedSpaceId(data!.id as string)
      setNewSpaceName('')
      setSyncStatus('success')
      toast.success('Space created')
    } catch (err) {
      console.error('Create space failed', err)
      setSyncStatus('error')
      toast.error('Failed to create space')
    }
  }

  const handleSaveSpace = async () => {
    try {
      if (!selectedSpaceId || selectedSpaceId === 'new') {
        toast.error('Select a space to save')
        return
      }
      setSyncStatus('syncing')
      // 1) Rename space if changed
      const newName = editSpaceName.trim()
      if (newName && newName !== selectedSpace?.name) {
        const { error: renameError } = await supabase
          .from('workout_spaces')
          .update({ name: newName })
          .eq('id', selectedSpaceId)
        if (renameError) throw renameError
        setSpaces((prev) => prev.map((s) => (s.id === selectedSpaceId ? { ...s, name: newName } : s)).sort((a,b)=>a.name.localeCompare(b.name)))
      }
      // 2) Sync equipment mappings (upsert inserts for checked, delete removed)
      const { data: existingRows, error: fetchMapErr } = await supabase
        .from('space_equipment')
        .select('equipment_id')
        .eq('space_id', selectedSpaceId)
      if (fetchMapErr) throw fetchMapErr
      const existing = new Set<string>((existingRows ?? []).map((r: any) => r.equipment_id as string))
      const desired = selectedEquipmentIds
      const toInsert = Array.from(desired).filter((id) => !existing.has(id))
      const toDelete = Array.from(existing).filter((id) => !desired.has(id))

      if (toInsert.length > 0) {
        const rows = toInsert.map((equipment_id) => ({ space_id: selectedSpaceId, equipment_id }))
        const { error: insertErr } = await supabase.from('space_equipment').insert(rows)
        if (insertErr) throw insertErr
      }
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('space_equipment')
          .delete()
          .eq('space_id', selectedSpaceId)
          .in('equipment_id', toDelete)
        if (delErr) throw delErr
      }

      setSyncStatus('success')
      toast.success('Space saved')
    } catch (err) {
      console.error('Save space failed', err)
      setSyncStatus('error')
      toast.error('Failed to save space')
    }
  }

  const handleDeleteSpace = async (spaceId: string) => {
    try {
      if (!userId) {
        toast.error('Please sign in to delete spaces')
        return
      }
      setSyncStatus('syncing')
      const { error } = await supabase
        .from('workout_spaces')
        .delete()
        .eq('id', spaceId)
      if (error) throw error
      setSpaces((prev) => prev.filter((s) => s.id !== spaceId))
      if (selectedSpaceId === spaceId) {
        setSelectedSpaceId('new')
        setEditSpaceName('')
        setSelectedEquipmentIds(new Set())
      }
      setSyncStatus('success')
      toast.success('Space deleted')
    } catch (err) {
      console.error('Delete space failed', err)
      setSyncStatus('error')
      toast.error('Failed to delete space')
    }
  }

  const toggleEquipment = (id: string, checked: boolean | string) => {
    setSelectedEquipmentIds((prev) => {
      const next = new Set(prev)
      const isOn = checked === true
      if (isOn) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Workout Spaces</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {getSyncIcon()}
          <span>
            {syncStatus === 'syncing' && 'Syncing...'}
            {syncStatus === 'success' && 'Synced'}
            {syncStatus === 'error' && 'Sync failed'}
            {syncStatus === 'idle' && 'Ready'}
          </span>
        </div>
      </div>

      {!isPaidTier && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Spaces sync to your account on paid tiers. You can still preview the UI.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 border rounded-md overflow-hidden divide-y lg:divide-y-0 lg:divide-x">
        <div className="lg:col-span-1 space-y-6 p-4 lg:p-6">
          <div className="space-y-3">
            <h3 className="text-base font-medium">Create Space</h3>
            <p className="text-sm text-muted-foreground">Name a new workout space</p>
            <Input
              placeholder="e.g. Home Gym"
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
            />
            <Button onClick={handleCreateSpace} disabled={!newSpaceName.trim() || !userId}>Create</Button>
          </div>

          <Separator className="my-2" />

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-base font-medium">Manage Space</h3>
              <p className="text-sm text-muted-foreground">Select a space and configure its equipment</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Selected space</label>
              {selectedSpaceId !== 'new' && selectedSpace ? (
                <div className="text-sm"><span className="text-muted-foreground">Selected:</span> <span className="font-medium">{selectedSpace.name}</span></div>
              ) : (
                <div className="text-sm text-muted-foreground">Create a space or select one to edit</div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Space name</label>
              <Input
                placeholder="Space name"
                value={selectedSpaceId === 'new' ? newSpaceName : editSpaceName}
                onChange={(e) => selectedSpaceId === 'new' ? setNewSpaceName(e.target.value) : setEditSpaceName(e.target.value)}
                disabled={selectedSpaceId === 'new'}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium">Equipment in this space</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto overflow-x-visible pr-4 px-2 pt-2 pb-2 mt-2" style={{ scrollbarGutter: 'stable' }}>
                {equipment.map((eq) => (
                  <Checkbox
                    key={eq.id}
                    variant="chip"
                    checked={selectedEquipmentIds.has(eq.id)}
                    onCheckedChange={(checked) => toggleEquipment(eq.id, checked)}
                    disabled={selectedSpaceId === 'new'}
                    className="text-sm w-full justify-between"
                  >
                    <span className="truncate">{eq.name}</span>
                    {eq.category && (
                      <span className="ml-2 text-xs text-muted-foreground">{eq.category}</span>
                    )}
                  </Checkbox>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleSaveSpace} disabled={selectedSpaceId === 'new' || !userId}>
                Save Space
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-medium">Your Spaces</h2>
            <Badge variant="secondary">{spaces.length}</Badge>
          </div>
          {spaces.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">No spaces yet. Create one on the left.</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {spaces.map((s) => {
                const isSelected = s.id === selectedSpaceId
                return (
                  <Card
                    key={s.id}
                    className={`cursor-pointer ${isSelected ? 'ring-1 ring-primary' : ''}`}
                    onClick={() => setSelectedSpaceId(s.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base truncate">{s.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-2 pt-0">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation() }}>
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this space?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the space "{s.name}" and its equipment assignments.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDeleteSpace(s.id) }}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

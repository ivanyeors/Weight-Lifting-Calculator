"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { PanelLeft, PanelRight, Plus, RefreshCw, CheckCircle, AlertCircle, Cloud, Pencil } from 'lucide-react'
import { UsersSidebar, type ManagedUserForm, type UsersFilterForm } from './users-sidebar'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/lib/supabaseClient'
import { ContOnboardAlert } from '@/components/cont-onboard'

type SyncState = 'idle' | 'syncing' | 'success' | 'error'

type ManagedUser = {
  id: string
  name: string
  body_weight_kg: number | null
  height_cm: number | null
  age: number | null
  skeletal_muscle_mass_kg: number | null
  body_fat_mass_kg: number | null
  gender: 'male' | 'female' | null
  experience: 'cat1' | 'cat2' | 'cat3' | 'cat4' | 'cat5' | null
  medical_conditions: string[] | null
  food_allergies: string[] | null
  goals: string | null
  note: string | null
}

export default function PlansUsersPage() {
  const [syncStatus, setSyncStatus] = useState<SyncState>('idle')
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    // Default to collapsed on mobile/tablet, expanded on desktop
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024; // lg breakpoint
    }
    return true; // Default to collapsed on server-side
  })
  const [users, setUsers] = useState<ManagedUser[]>([])
  const defaultNewUser = (): ManagedUserForm => ({
    name: '', bodyWeight: null, height: null, age: null,
    skeletalMuscleMass: null, bodyFatMass: null,
    gender: 'male', experience: 'cat3',
    injuries: [], medicalConditions: [], foodAllergies: [],
    goals: '', note: ''
  })
  const defaultFilter = (): UsersFilterForm => ({
    name: '',
    bodyWeightRange: [30, 200],
    heightRange: [120, 220],
    ageRange: [10, 90],
    skeletalMuscleMassRange: [10, 60],
    bodyFatMassRange: [2, 60],
    gender: '',
    experience: '',
    injuries: [],
    medicalConditions: [],
    foodAllergies: [],
  })
  const [newUserForm, setNewUserForm] = useState<ManagedUserForm>(defaultNewUser())
  const [filterDraft, setFilterDraft] = useState<UsersFilterForm>(defaultFilter())
  const [appliedFilters, setAppliedFilters] = useState<UsersFilterForm>(defaultFilter())
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [muscles, setMuscles] = useState<Array<{ id: string; name: string }>>([])
  const [userInjuries, setUserInjuries] = useState<Record<string, string[]>>({})
  
  // User detail drawer state
  const [isUserDetailDrawerOpen, setIsUserDetailDrawerOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const loadMuscles = useCallback(async () => {
    const { data, error } = await supabase.from('muscles').select('id, name').order('name', { ascending: true })
    if (!error) setMuscles((data ?? []) as Array<{ id: string; name: string }>)
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      setSyncStatus('syncing')
      const { data, error } = await supabase
        .from('managed_users')
        .select('id, name, body_weight_kg, height_cm, age, skeletal_muscle_mass_kg, body_fat_mass_kg, gender, experience, medical_conditions, food_allergies, goals, note')
        .order('updated_at', { ascending: false })
      if (error) throw error
      setUsers((data ?? []) as ManagedUser[])
      // Fetch injuries for loaded users for filtering
      const ids = (data ?? []).map((u: ManagedUser) => u.id)
      if (ids.length > 0) {
        const { data: inj } = await supabase
          .from('managed_user_injuries')
          .select('user_id, muscle_id')
          .in('user_id', ids)
        const map: Record<string, string[]> = {}
        ;(inj ?? []).forEach((r: { user_id: string; muscle_id: string }) => {
          const uid = r.user_id
          const mid = r.muscle_id
          if (!map[uid]) map[uid] = []
          map[uid].push(mid)
        })
        setUserInjuries(map)
      } else {
        setUserInjuries({})
      }
      setSyncStatus('success')
    } catch (error) {
      console.error('Error loading users:', error)
      setSyncStatus('error')
    }
  }, [])

  const openUserDetail = useCallback((user: ManagedUser) => {
    setSelectedUser(user)
    setEditingUser(user)
    setIsEditing(false)
    setIsUserDetailDrawerOpen(true)
  }, [])

  useEffect(() => { loadUsers(); loadMuscles(); }, [loadUsers, loadMuscles])

  // Listen for storage events to auto-refresh when data changes from other pages
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'fitspo:selected_user_changed' || e.key === 'fitspo:users_updated') {
        loadUsers()
      }
    }
    
    const handleCustomEvent = () => {
      loadUsers()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
      window.addEventListener('fitspo:users_updated', handleCustomEvent)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('fitspo:users_updated', handleCustomEvent)
      }
    }
  }, [loadUsers])

  const createUser = async () => {
    try {
      setSyncStatus('syncing')
      const name = newUserForm.name.trim() || 'New User'
      const { data, error } = await supabase
        .from('managed_users')
        .insert({
          owner_id: (await supabase.auth.getUser()).data.user?.id,
          name,
          body_weight_kg: newUserForm.bodyWeight,
          height_cm: newUserForm.height,
          age: newUserForm.age,
          skeletal_muscle_mass_kg: newUserForm.skeletalMuscleMass,
          body_fat_mass_kg: newUserForm.bodyFatMass,
          gender: newUserForm.gender,
          experience: newUserForm.experience,
          medical_conditions: newUserForm.medicalConditions,
          food_allergies: newUserForm.foodAllergies,
          goals: newUserForm.goals,
          note: newUserForm.note,
        })
        .select('id')
        .single()
      if (error) throw error
      const newId = data!.id as string
      // injuries
      if (newUserForm.injuries.length > 0) {
        const rows = newUserForm.injuries.map((muscle_id) => ({ user_id: newId, muscle_id }))
        await supabase.from('managed_user_injuries').insert(rows)
      }
      await loadUsers()
      setIsDrawerOpen(false)
      setNewUserForm(defaultNewUser())
      setSyncStatus('success')
      // Notify other pages that users data has been updated
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('fitspo:users_updated'))
      }
    } catch (error) {
      console.error('Error creating user:', error)
      setSyncStatus('error')
    }
  }

  const filteredUsers = useMemo(() => {
    const f = appliedFilters
    const norm = (s: string) => s.toLowerCase().trim()
    return users.filter((u) => {
      if (f.name && !u.name.toLowerCase().includes(norm(f.name))) return false
      if (u.body_weight_kg != null && (u.body_weight_kg < f.bodyWeightRange[0] || u.body_weight_kg > f.bodyWeightRange[1])) return false
      if (u.height_cm != null && (u.height_cm < f.heightRange[0] || u.height_cm > f.heightRange[1])) return false
      if (u.age != null && (u.age < f.ageRange[0] || u.age > f.ageRange[1])) return false
      if (u.skeletal_muscle_mass_kg != null && (u.skeletal_muscle_mass_kg < f.skeletalMuscleMassRange[0] || u.skeletal_muscle_mass_kg > f.skeletalMuscleMassRange[1])) return false
      if (u.body_fat_mass_kg != null && (u.body_fat_mass_kg < f.bodyFatMassRange[0] || u.body_fat_mass_kg > f.bodyFatMassRange[1])) return false
      if (f.gender && u.gender !== f.gender) return false
      if (f.experience && u.experience !== f.experience) return false
      if (f.medicalConditions.length > 0) {
        const uConds = (u.medical_conditions ?? []).map(norm)
        const allIn = f.medicalConditions.every((c) => uConds.includes(norm(c)))
        if (!allIn) return false
      }
      if (f.foodAllergies.length > 0) {
        const uAll = (u.food_allergies ?? []).map(norm)
        const allIn = f.foodAllergies.every((a) => uAll.includes(norm(a)))
        if (!allIn) return false
      }
      if (f.injuries.length > 0) {
        const uInj = userInjuries[u.id] ?? []
        const allIn = f.injuries.every((m) => uInj.includes(m))
        if (!allIn) return false
      }
      return true
    })
  }, [users, appliedFilters, userInjuries])

  return (
    <div className="flex h-screen">
      <UsersSidebar
        collapsed={sidebarCollapsed}
        form={filterDraft}
        setForm={(updater) => setFilterDraft((prev) => updater(prev))}
        muscles={muscles}
        onSearch={() => setAppliedFilters(filterDraft)}
        onReset={() => { setFilterDraft(defaultFilter()); setAppliedFilters(defaultFilter()) }}
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
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => loadUsers()}
              aria-label="Refresh users"
              disabled={syncStatus === 'syncing'}
            >
              <RefreshCw className={`h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {syncStatus === 'syncing' && <RefreshCw className="h-4 w-4 animate-spin" />}
              {syncStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
              {syncStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
              {syncStatus === 'idle' && <Cloud className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {syncStatus === 'syncing' && 'Syncing...'}
                {syncStatus === 'success' && 'Synced'}
                {syncStatus === 'error' && 'Sync failed'}
                {syncStatus === 'idle' && 'Ready'}
              </span>
            </div>
            <Button onClick={() => { setIsDrawerOpen(true) }}>
              <Plus className="h-4 w-4" />
              New User
            </Button>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="flex items-center gap-2 mb-3">
      <h1 className="text-2xl font-semibold">Users</h1>
            <Badge variant="secondary">{filteredUsers.length}</Badge>
          </div>

          {filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">No users yet. Create one to get started.</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredUsers.map((u) => (
                <Card key={u.id} className="cursor-pointer hover:shadow-md hover:border-white transition-all duration-200" onClick={() => openUserDetail(u)}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base truncate">{u.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm text-muted-foreground">
                      <div className="grid grid-cols-2 gap-2">
                        <div>BW: {u.body_weight_kg ?? '—'} kg</div>
                        <div>H: {u.height_cm ?? '—'} cm</div>
                        <div>Age: {u.age ?? '—'}</div>
                        <div>Gender: {u.gender ?? '—'}</div>
                      </div>
                    </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create user drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} direction="right">
        <DrawerContent className="data-[vaul-drawer-direction=right]:!w-[80vw] data-[vaul-drawer-direction=right]:!max-w-none lg:data-[vaul-drawer-direction=right]:!w-1/2">
          <div className="flex flex-col h-full">
            <DrawerHeader className="pb-0">
              <DrawerTitle className="text-xl">Create User</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 overflow-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Name</Label>
                  <Input value={newUserForm.name} onChange={(e) => setNewUserForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Alex" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Body Weight (kg)</Label>
                  <Input inputMode="decimal" value={newUserForm.bodyWeight ?? ''} onChange={(e) => setNewUserForm((p) => ({ ...p, bodyWeight: Number(e.target.value) || null }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Height (cm)</Label>
                  <Input inputMode="numeric" value={newUserForm.height ?? ''} onChange={(e) => setNewUserForm((p) => ({ ...p, height: Number(e.target.value) || null }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Age</Label>
                  <Input inputMode="numeric" value={newUserForm.age ?? ''} onChange={(e) => setNewUserForm((p) => ({ ...p, age: Number(e.target.value) || null }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">SMM (kg)</Label>
                  <Input inputMode="decimal" value={newUserForm.skeletalMuscleMass ?? ''} onChange={(e) => setNewUserForm((p) => ({ ...p, skeletalMuscleMass: Number(e.target.value) || null }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">BFM (kg)</Label>
                  <Input inputMode="decimal" value={newUserForm.bodyFatMass ?? ''} onChange={(e) => setNewUserForm((p) => ({ ...p, bodyFatMass: Number(e.target.value) || null }))} />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Gender</Label>
                  <Select value={newUserForm.gender} onValueChange={(v: 'male' | 'female') => setNewUserForm((p) => ({ ...p, gender: v }))}>
                    <SelectTrigger className="w-full h-10 bg-background border-border">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="w-full">
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Experience</Label>
                  <Select value={newUserForm.experience} onValueChange={(v: ManagedUserForm['experience']) => setNewUserForm((p) => ({ ...p, experience: v }))}>
                    <SelectTrigger className="w-full h-10 bg-background border-border">
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent className="w-full max-h-60">
                      <SelectItem value="cat1">Cat I (0-6m)</SelectItem>
                      <SelectItem value="cat2">Cat II (6-12m)</SelectItem>
                      <SelectItem value="cat3">Cat III (1-2y)</SelectItem>
                      <SelectItem value="cat4">Cat IV (3-4y)</SelectItem>
                      <SelectItem value="cat5">Cat V (5+y)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm font-medium">Past Injuries (muscles)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {muscles.map((m) => (
                      <Checkbox
                        key={m.id}
                        variant="chip"
                        checked={newUserForm.injuries.includes(m.id)}
                        onCheckedChange={(checked) => {
                          setNewUserForm((p) => {
                            const on = checked === true
                            const set = new Set(p.injuries)
                            if (on) set.add(m.id)
                            else set.delete(m.id)
                            return { ...p, injuries: Array.from(set) }
                          })
                        }}
                        className="text-sm w-full justify-between"
                      >
                        <span className="truncate">{m.name}</span>
                      </Checkbox>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Medical Conditions (comma-separated)</Label>
                  <Input
                    placeholder="e.g. Hypertension, Asthma"
                    value={newUserForm.medicalConditions.join(', ')}
                    onChange={(e) => setNewUserForm((p) => ({ ...p, medicalConditions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Food Allergies (comma-separated)</Label>
                  <Input
                    placeholder="e.g. Nuts, Dairy"
                    value={newUserForm.foodAllergies.join(', ')}
                    onChange={(e) => setNewUserForm((p) => ({ ...p, foodAllergies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm font-medium">Goals</Label>
                  <textarea
                    className="w-full min-h-20 rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Describe goals"
                    value={newUserForm.goals}
                    onChange={(e) => setNewUserForm((p) => ({ ...p, goals: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm font-medium">Note</Label>
                  <textarea
                    className="w-full min-h-20 rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Additional notes"
                    value={newUserForm.note}
                    onChange={(e) => setNewUserForm((p) => ({ ...p, note: e.target.value }))}
                  />
                </div>
                <div className="pt-2 sm:col-span-2">
                  <Button onClick={createUser} disabled={syncStatus === 'syncing'}>Create</Button>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* User Detail Drawer */}
      <Drawer open={isUserDetailDrawerOpen} onOpenChange={setIsUserDetailDrawerOpen} direction="right">
        <DrawerContent className="data-[vaul-drawer-direction=right]:!w-[80vw] data-[vaul-drawer-direction=right]:!max-w-none lg:data-[vaul-drawer-direction=right]:!w-1/2">
          <div className="flex flex-col h-full">
            <DrawerHeader className="pb-0">
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-xl">
                  {isEditing ? 'Edit User' : selectedUser?.name || 'User Details'}
                </DrawerTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={!selectedUser}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
              </div>
            </DrawerHeader>
            <div className="p-4 overflow-auto">
              {selectedUser && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Name</Label>
                    <Input 
                      value={editingUser?.name || ''} 
                      onChange={(e) => setEditingUser(prev => prev ? { ...prev, name: e.target.value } : null)}
                      placeholder="e.g. Alex"
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Body Weight (kg)</Label>
                    <Input 
                      inputMode="decimal" 
                      value={editingUser?.body_weight_kg ?? ''} 
                      onChange={(e) => setEditingUser(prev => prev ? { ...prev, body_weight_kg: Number(e.target.value) || null } : null)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Height (cm)</Label>
                    <Input 
                      inputMode="numeric" 
                      value={editingUser?.height_cm ?? ''} 
                      onChange={(e) => setEditingUser(prev => prev ? { ...prev, height_cm: Number(e.target.value) || null } : null)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Age</Label>
                    <Input 
                      inputMode="numeric" 
                      value={editingUser?.age ?? ''} 
                      onChange={(e) => setEditingUser(prev => prev ? { ...prev, age: Number(e.target.value) || null } : null)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">SMM (kg)</Label>
                    <Input 
                      inputMode="decimal" 
                      value={editingUser?.skeletal_muscle_mass_kg ?? ''} 
                      onChange={(e) => setEditingUser(prev => prev ? { ...prev, skeletal_muscle_mass_kg: Number(e.target.value) || null } : null)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">BFM (kg)</Label>
                    <Input 
                      inputMode="decimal" 
                      value={editingUser?.body_fat_mass_kg ?? ''} 
                      onChange={(e) => setEditingUser(prev => prev ? { ...prev, body_fat_mass_kg: Number(e.target.value) || null } : null)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Gender</Label>
                    <Select 
                      value={editingUser?.gender || 'male'} 
                      onValueChange={(v: 'male' | 'female') => setEditingUser(prev => prev ? { ...prev, gender: v } : null)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="w-full h-10 bg-background border-border">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent className="w-full">
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Experience</Label>
                    <Select 
                      value={editingUser?.experience || 'cat3'} 
                      onValueChange={(v: string) => setEditingUser(prev => prev ? { ...prev, experience: v as ManagedUser['experience'] } : null)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="w-full h-10 bg-background border-border">
                        <SelectValue placeholder="Select experience" />
                      </SelectTrigger>
                      <SelectContent className="w-full max-h-60">
                        <SelectItem value="cat1">Cat I (0-6m)</SelectItem>
                        <SelectItem value="cat2">Cat II (6-12m)</SelectItem>
                        <SelectItem value="cat3">Cat III (1-2y)</SelectItem>
                        <SelectItem value="cat4">Cat IV (3-4y)</SelectItem>
                        <SelectItem value="cat5">Cat V (5+y)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-sm font-medium">Past Injuries (muscles)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {muscles.map((m) => (
                        <Checkbox
                          key={m.id}
                          variant="chip"
                          checked={(userInjuries[selectedUser.id] || []).includes(m.id)}
                          onCheckedChange={(checked) => {
                            if (!isEditing) return
                            const currentInjuries = userInjuries[selectedUser.id] || []
                            const newInjuries = checked
                              ? [...currentInjuries, m.id]
                              : currentInjuries.filter(id => id !== m.id)
                            setUserInjuries(prev => ({ ...prev, [selectedUser.id]: newInjuries }))
                          }}
                          className="text-sm w-full justify-between"
                          disabled={!isEditing}
                        >
                          <span className="truncate">{m.name}</span>
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Medical Conditions (comma-separated)</Label>
                    <Input
                      placeholder="e.g. Hypertension, Asthma"
                      value={(editingUser?.medical_conditions || []).join(', ')}
                      onChange={(e) => setEditingUser(prev => prev ? { ...prev, medical_conditions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : null)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Food Allergies (comma-separated)</Label>
                    <Input
                      placeholder="e.g. Nuts, Dairy"
                      value={(editingUser?.food_allergies || []).join(', ')}
                      onChange={(e) => setEditingUser(prev => prev ? { ...prev, food_allergies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : null)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-sm font-medium">Goals</Label>
                    <textarea
                      className="w-full min-h-20 rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
                      placeholder="Describe goals"
                      value={editingUser?.goals || ''}
                      onChange={(e) => setEditingUser(prev => prev ? { ...prev, goals: e.target.value } : null)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-sm font-medium">Note</Label>
                    <textarea
                      className="w-full min-h-20 rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
                      placeholder="Additional notes"
                      value={editingUser?.note || ''}
                      disabled={!isEditing}
                      onChange={(e) => setEditingUser(prev => prev ? { ...prev, note: e.target.value } : null)}
                    />
                  </div>
                  {isEditing && (
                    <div className="pt-2 sm:col-span-2">
                      <Button 
                        onClick={async () => {
                          if (!editingUser) return
                          try {
                            setSyncStatus('syncing')
                            // Update user data
                            const { error: userError } = await supabase
                              .from('managed_users')
                              .update({
                                name: editingUser.name,
                                body_weight_kg: editingUser.body_weight_kg,
                                height_cm: editingUser.height_cm,
                                age: editingUser.age,
                                skeletal_muscle_mass_kg: editingUser.skeletal_muscle_mass_kg,
                                body_fat_mass_kg: editingUser.body_fat_mass_kg,
                                gender: editingUser.gender,
                                experience: editingUser.experience,
                                medical_conditions: editingUser.medical_conditions,
                                food_allergies: editingUser.food_allergies,
                                goals: editingUser.goals,
                                note: editingUser.note,
                              })
                              .eq('id', editingUser.id)
                            
                            if (userError) throw userError

                            // Update injuries
                            const currentInjuries = userInjuries[selectedUser.id] || []
                            const { error: injuryError } = await supabase
                              .from('managed_user_injuries')
                              .delete()
                              .eq('user_id', selectedUser.id)
                            
                            if (injuryError) throw injuryError

                            if (currentInjuries.length > 0) {
                              const injuryRows = currentInjuries.map(muscle_id => ({ 
                                user_id: selectedUser.id, 
                                muscle_id 
                              }))
                              const { error: insertError } = await supabase
                                .from('managed_user_injuries')
                                .insert(injuryRows)
                              
                              if (insertError) throw insertError
                            }

                            await loadUsers()
                            setIsEditing(false)
                            setSyncStatus('success')
                            // Notify other pages that users data has been updated
                            if (typeof window !== 'undefined') {
                              window.dispatchEvent(new Event('fitspo:users_updated'))
                            }
                          } catch (error) {
                            console.error('Error updating user:', error)
                            setSyncStatus('error')
                          }
                        }}
                        disabled={syncStatus === 'syncing'}
                      >
                        Save Changes
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Continue Onboarding Alert */}
      <ContOnboardAlert />
    </div>
  )
}



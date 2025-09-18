"use client"

import { useMemo } from 'react'
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { User } from "lucide-react"
import { Slider } from '@/components/ui/slider'

export type ManagedUserForm = {
  name: string
  bodyWeight: number | null
  height: number | null
  age: number | null
  skeletalMuscleMass: number | null
  bodyFatMass: number | null
  gender: 'male' | 'female'
  experience: 'cat1' | 'cat2' | 'cat3' | 'cat4' | 'cat5'
  injuries: string[] // muscle ids
  medicalConditions: string[]
  foodAllergies: string[]
  goals: string
  note: string
}

export type UsersFilterForm = {
  name: string
  bodyWeightRange: [number, number]
  heightRange: [number, number]
  ageRange: [number, number]
  skeletalMuscleMassRange: [number, number]
  bodyFatMassRange: [number, number]
  gender: '' | 'male' | 'female'
  experience: '' | 'cat1' | 'cat2' | 'cat3' | 'cat4' | 'cat5'
  injuries: string[] // muscle ids
  medicalConditions: string[]
  foodAllergies: string[]
}

export function UsersSidebar({
  collapsed,
  form,
  setForm,
  muscles,
  onSearch,
  onReset,
  asDrawer = false,
}: {
  collapsed: boolean
  form: UsersFilterForm
  setForm: (updater: (prev: UsersFilterForm) => UsersFilterForm) => void
  muscles: Array<{ id: string; name: string }>
  onSearch: () => void
  onReset: () => void
  asDrawer?: boolean
}) {

  const musclesSorted = useMemo(() => {
    return [...muscles].sort((a, b) => a.name.localeCompare(b.name))
  }, [muscles])

  if (asDrawer) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <div className="px-2 space-y-5 pb-24">
            <Separator className="my-1" />

            <div className="space-y-3">
              <Label className="text-sm font-medium">Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Alex"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Body Weight (kg)</Label>
                <Slider value={form.bodyWeightRange} min={30} max={200} step={1} onValueChange={(v) => setForm((p) => ({ ...p, bodyWeightRange: [v[0], v[1]] as [number, number] }))} />
                <div className="text-xs text-muted-foreground">{form.bodyWeightRange[0]} - {form.bodyWeightRange[1]} kg</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Height (cm)</Label>
                <Slider value={form.heightRange} min={120} max={220} step={1} onValueChange={(v) => setForm((p) => ({ ...p, heightRange: [v[0], v[1]] as [number, number] }))} />
                <div className="text-xs text-muted-foreground">{form.heightRange[0]} - {form.heightRange[1]} cm</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Age</Label>
                <Slider value={form.ageRange} min={10} max={90} step={1} onValueChange={(v) => setForm((p) => ({ ...p, ageRange: [v[0], v[1]] as [number, number] }))} />
                <div className="text-xs text-muted-foreground">{form.ageRange[0]} - {form.ageRange[1]}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">SMM (kg)</Label>
                <Slider value={form.skeletalMuscleMassRange} min={10} max={60} step={1} onValueChange={(v) => setForm((p) => ({ ...p, skeletalMuscleMassRange: [v[0], v[1]] as [number, number] }))} />
                <div className="text-xs text-muted-foreground">{form.skeletalMuscleMassRange[0]} - {form.skeletalMuscleMassRange[1]} kg</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">BFM (kg)</Label>
                <Slider value={form.bodyFatMassRange} min={2} max={60} step={1} onValueChange={(v) => setForm((p) => ({ ...p, bodyFatMassRange: [v[0], v[1]] as [number, number] }))} />
                <div className="text-xs text-muted-foreground">{form.bodyFatMassRange[0]} - {form.bodyFatMassRange[1]} kg</div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Gender</Label>
              <Select value={form.gender} onValueChange={(v: 'male' | 'female') => setForm((p) => ({ ...p, gender: v }))}>
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
              <Select value={form.experience} onValueChange={(v: ManagedUserForm['experience']) => setForm((p) => ({ ...p, experience: v }))}>
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

            <div className="space-y-2">
              <Label className="text-sm font-medium">Past Injuries (muscles)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[520px] overflow-auto pr-0">
                {musclesSorted.map((m) => (
                  <Checkbox
                    key={m.id}
                    variant="chip"
                    checked={form.injuries.includes(m.id)}
                    onCheckedChange={(checked) => {
                      setForm((p) => {
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
                value={form.medicalConditions.join(', ')}
                onChange={(e) => setForm((p) => ({ ...p, medicalConditions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Food Allergies (comma-separated)</Label>
              <Input
                placeholder="e.g. Nuts, Dairy"
                value={form.foodAllergies.join(', ')}
                onChange={(e) => setForm((p) => ({ ...p, foodAllergies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              />
            </div>

            <Separator className="my-1" />
          </div>
        </div>
        <div className="border-t px-2 py-2 bg-background">
          <div className="flex gap-2">
            <Button className="flex-1" onClick={onSearch}>Search</Button>
            <Button variant="secondary" onClick={onReset}>Reset</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={[
        collapsed
          ? 'hidden'
          : 'fixed inset-y-0 left-0 z-50 w-[24rem] max-w-[90vw] shadow-lg lg:sticky lg:top-0 lg:self-start lg:w-[19.2rem] lg:max-w-none',
        'border-r bg-background flex flex-col h-full lg:h-screen transition-all p-0'
      ].join(' ')}
    >
      <div className="px-2 pt-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <User className="h-6 w-6 text-primary" />
            {!collapsed && (
              <h2 className="text-sm font-semibold">Filter Users</h2>
            )}
          </div>
        </div>
      </div>

      {!collapsed && (
        <>
        <div className="flex-1 overflow-auto">
          <div className="px-2 space-y-5 pb-24">
            <Separator className="my-1" />

            <div className="space-y-3">
              <Label className="text-sm font-medium">Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Alex"
              />
            </div>

            {/* Metrics - range sliders */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Body Weight (kg)</Label>
                <Slider value={form.bodyWeightRange} min={30} max={200} step={1} onValueChange={(v) => setForm((p) => ({ ...p, bodyWeightRange: [v[0], v[1]] as [number, number] }))} />
                <div className="text-xs text-muted-foreground">{form.bodyWeightRange[0]} - {form.bodyWeightRange[1]} kg</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Height (cm)</Label>
                <Slider value={form.heightRange} min={120} max={220} step={1} onValueChange={(v) => setForm((p) => ({ ...p, heightRange: [v[0], v[1]] as [number, number] }))} />
                <div className="text-xs text-muted-foreground">{form.heightRange[0]} - {form.heightRange[1]} cm</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Age</Label>
                <Slider value={form.ageRange} min={10} max={90} step={1} onValueChange={(v) => setForm((p) => ({ ...p, ageRange: [v[0], v[1]] as [number, number] }))} />
                <div className="text-xs text-muted-foreground">{form.ageRange[0]} - {form.ageRange[1]}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">SMM (kg)</Label>
                <Slider value={form.skeletalMuscleMassRange} min={10} max={60} step={1} onValueChange={(v) => setForm((p) => ({ ...p, skeletalMuscleMassRange: [v[0], v[1]] as [number, number] }))} />
                <div className="text-xs text-muted-foreground">{form.skeletalMuscleMassRange[0]} - {form.skeletalMuscleMassRange[1]} kg</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">BFM (kg)</Label>
                <Slider value={form.bodyFatMassRange} min={2} max={60} step={1} onValueChange={(v) => setForm((p) => ({ ...p, bodyFatMassRange: [v[0], v[1]] as [number, number] }))} />
                <div className="text-xs text-muted-foreground">{form.bodyFatMassRange[0]} - {form.bodyFatMassRange[1]} kg</div>
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Gender</Label>
              <Select value={form.gender} onValueChange={(v: 'male' | 'female') => setForm((p) => ({ ...p, gender: v }))}>
                <SelectTrigger className="w-full h-10 bg-background border-border">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent className="w-full">
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Experience */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Experience</Label>
              <Select value={form.experience} onValueChange={(v: ManagedUserForm['experience']) => setForm((p) => ({ ...p, experience: v }))}>
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

            {/* Injuries */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Past Injuries (muscles)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[520px] overflow-auto pr-0">
                {musclesSorted.map((m) => (
                  <Checkbox
                    key={m.id}
                    variant="chip"
                    checked={form.injuries.includes(m.id)}
                    onCheckedChange={(checked) => {
                      setForm((p) => {
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

            {/* Conditions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Medical Conditions (comma-separated)</Label>
              <Input
                placeholder="e.g. Hypertension, Asthma"
                value={form.medicalConditions.join(', ')}
                onChange={(e) => setForm((p) => ({ ...p, medicalConditions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              />
            </div>

            {/* Allergies */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Food Allergies (comma-separated)</Label>
              <Input
                placeholder="e.g. Nuts, Dairy"
                value={form.foodAllergies.join(', ')}
                onChange={(e) => setForm((p) => ({ ...p, foodAllergies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              />
            </div>

            {/* Goals and Note removed for filtering */}

            <Separator className="my-1" />
          </div>
        </div>
        <div className="border-t px-2 py-2 bg-background">
          <div className="flex gap-2">
            <Button className="flex-1" onClick={onSearch}>Search</Button>
            <Button variant="secondary" onClick={onReset}>Reset</Button>
          </div>
        </div>
        </>
      )}
    </div>
  )
}



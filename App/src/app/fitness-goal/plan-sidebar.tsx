"use client"

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UserSwitcher } from '@/components/user-switcher'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Plan } from './plan-types'
import { Label as UILabel } from '@/components/ui/label'
import { X } from 'lucide-react'
import { usePlans } from './plan-store'
import { deletePlan } from './plan-api'

export function PlanSidebar({
  selectedUserId,
  onSelectUser,
  onCreatePlan,
  plans,
  selectedPlanId,
  onSelectPlan,
}: {
  selectedUserId: string
  onSelectUser: (id: string) => void
  onCreatePlan: () => void
  plans: Plan[]
  selectedPlanId?: string | null
  onSelectPlan?: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'paused' | 'completed' | 'draft'>('all')
  const [duration, setDuration] = useState<'all' | 'lt4' | '4to8' | 'gt8'>('all')
  const { remove } = usePlans(selectedUserId || null)

  const filtered = useMemo(() => {
    let out = plans
    if (status !== 'all') out = out.filter(p => p.status === status)
    if (duration !== 'all') {
      out = out.filter(p => {
        const d = p.durationDays || 0
        if (duration === 'lt4') return d > 0 && d < 28
        if (duration === '4to8') return d >= 28 && d <= 56
        if (duration === 'gt8') return d > 56
        return true
      })
    }
    const q = search.trim().toLowerCase()
    if (!q) return out
    return out.filter(p => p.title.toLowerCase().includes(q))
  }, [plans, search, status, duration])

  return (
    <aside className="w-72 shrink-0 border-r bg-background flex flex-col">
      <div className="p-3 border-b space-y-3">
        <UserSwitcher onSelected={onSelectUser} />
        <Button className="w-full" onClick={onCreatePlan}>Create Plan</Button>
      </div>
      <div className="p-3 border-b space-y-2">
        <Input placeholder="Search plans…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Select value={duration} onValueChange={(v) => setDuration(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All durations</SelectItem>
              <SelectItem value="lt4">Less than 4 weeks</SelectItem>
              <SelectItem value="4to8">4–8 weeks</SelectItem>
              <SelectItem value="gt8">More than 8 weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="text-xs text-muted-foreground p-3">No plans yet</div>
        ) : (
          filtered.map((p) => {
            const active = selectedPlanId === p.id
            return (
              <div key={p.id} className={`group relative rounded p-2 hover:bg-muted/50 ${active ? 'bg-muted/50' : ''}`}>
                <button className="w-full text-left" onClick={() => onSelectPlan?.(p.id)}>
                  <div className="text-sm font-medium pr-6">{p.title}</div>
                  <div className="mt-1">
                    <UILabel className={`text-[10px] uppercase tracking-wide ${p.status === 'active' ? 'text-primary' : p.status === 'paused' ? 'text-muted-foreground' : p.status === 'completed' ? 'text-foreground' : 'text-muted-foreground'}`}>{p.status}</UILabel>
                  </div>
                </button>
                <button
                  className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive group-hover:flex"
                  aria-label="Delete plan"
                  onClick={async (e) => {
                    e.stopPropagation()
                    try {
                      remove(p.id)
                      try { await deletePlan(selectedUserId, p.id) } catch {}
                    } catch {}
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}

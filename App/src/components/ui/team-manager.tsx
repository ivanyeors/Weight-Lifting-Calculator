"use client"

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Users } from 'lucide-react'

type Team = {
  id: string
  name: string
  createdAt: string
}

const STORAGE_KEY = 'fitspo:teams'
const ACTIVE_TEAM_KEY = 'fitspo:active_team_id'

function readTeams(): Team[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeTeams(teams: Team[]) {
  try {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(teams))
  } catch {}
}

function readActiveTeamId(): string | null {
  try {
    return typeof window !== 'undefined' ? (localStorage.getItem(ACTIVE_TEAM_KEY) || null) : null
  } catch {
    return null
  }
}

function writeActiveTeamId(teamId: string | null) {
  try {
    if (typeof window === 'undefined') return
    if (teamId) localStorage.setItem(ACTIVE_TEAM_KEY, teamId)
    else localStorage.removeItem(ACTIVE_TEAM_KEY)
    window.dispatchEvent(new Event('fitspo:teams_changed'))
  } catch {}
}

export function TeamManager() {
  const [teams, setTeams] = useState<Team[]>([])
  const [newTeamName, setNewTeamName] = useState('')
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)

  useEffect(() => {
    setTeams(readTeams())
    setActiveTeamId(readActiveTeamId())
    const onStorage = () => {
      setTeams(readTeams())
      setActiveTeamId(readActiveTeamId())
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage)
      window.addEventListener('fitspo:teams_changed', onStorage)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage)
        window.removeEventListener('fitspo:teams_changed', onStorage)
      }
    }
  }, [])

  const canCreate = useMemo(() => newTeamName.trim().length >= 2, [newTeamName])

  const createTeam = () => {
    const name = newTeamName.trim()
    if (name.length < 2) return
    const now = new Date().toISOString()
    const team: Team = { id: `t_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`, name, createdAt: now }
    const next = [...teams, team]
    setTeams(next)
    writeTeams(next)
    setNewTeamName('')
    // Select the created team
    setActiveTeamId(team.id)
    writeActiveTeamId(team.id)
  }

  const removeTeam = (id: string) => {
    const next = teams.filter(t => t.id !== id)
    setTeams(next)
    writeTeams(next)
    if (activeTeamId === id) {
      const fallback = next[0]?.id || null
      setActiveTeamId(fallback)
      writeActiveTeamId(fallback)
    }
  }

  const selectActive = (id: string) => {
    setActiveTeamId(id)
    writeActiveTeamId(id)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
            <div className="space-y-2">
              <Label htmlFor="team-name">Create a team</Label>
              <Input id="team-name" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="e.g., Client Roster" />
            </div>
            <Button onClick={createTeam} disabled={!canCreate} className="md:w-40">
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">Your teams</div>
        {teams.length === 0 ? (
          <div className="text-sm text-muted-foreground">No teams yet. Create your first team above.</div>
        ) : (
          <div className="grid gap-3">
            {teams.map(team => (
              <div key={team.id} className={`flex items-center justify-between p-3 rounded-md border ${activeTeamId === team.id ? 'bg-primary/5 border-primary/30' : ''}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-md border flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{team.name}</div>
                    <div className="text-xs text-muted-foreground">Created {new Date(team.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeTeamId === team.id ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => selectActive(team.id)}>Set active</Button>
                  )}
                  <Button variant="outline" size="icon" onClick={() => removeTeam(team.id)} aria-label="Delete team">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}



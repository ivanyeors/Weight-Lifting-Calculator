"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Users } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

type UiTeam = { id: string; name: string; logo: React.ElementType; plan?: string }

const LOCAL_TEAMS_KEY = 'fitspo:teams'
const ACTIVE_TEAM_KEY = 'fitspo:active_team_id'

function readLocalTeams(): Array<{ id: string; name: string }> {
  try {
    if (typeof window === 'undefined') return []
    const raw = localStorage.getItem(LOCAL_TEAMS_KEY)
    const val = raw ? JSON.parse(raw) : []
    return Array.isArray(val) ? val.filter(t => t && typeof t.id === 'string' && typeof t.name === 'string') : []
  } catch {
    return []
  }
}

function readActiveTeamId(): string | null {
  try {
    if (typeof window === 'undefined') return null
    const id = localStorage.getItem(ACTIVE_TEAM_KEY)
    return id || null
  } catch {
    return null
  }
}

function writeActiveTeamId(id: string | null) {
  try {
    if (typeof window === 'undefined') return
    if (id) localStorage.setItem(ACTIVE_TEAM_KEY, id)
    else localStorage.removeItem(ACTIVE_TEAM_KEY)
    window.dispatchEvent(new Event('fitspo:teams_changed'))
  } catch {}
}

export function TeamSwitcher({
  teams,
}: {
  teams?: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
}) {
  const { isMobile } = useSidebar()

  const fallbackTeams: UiTeam[] = React.useMemo(() => {
    const list = (teams || []).map((t, idx) => ({ id: `fallback:${idx}`, name: t.name, logo: t.logo, plan: t.plan }))
    return list
  }, [teams])

  const getUiTeams = React.useCallback((): { list: UiTeam[]; local: boolean } => {
    const local = readLocalTeams()
    if (local.length > 0) {
      return {
        list: local.map(t => ({ id: t.id, name: t.name, logo: Users, plan: 'Trainer' })),
        local: true,
      }
    }
    return { list: fallbackTeams, local: false }
  }, [fallbackTeams])

  const [{ list: uiTeams, local: usingLocal }, setTeamsState] = React.useState<{ list: UiTeam[]; local: boolean }>(() => getUiTeams())
  const [activeTeamId, setActiveTeamId] = React.useState<string | null>(() => {
    const fromLocal = readActiveTeamId()
    if (fromLocal) return fromLocal
    return fallbackTeams[0]?.id || null
  })

  React.useEffect(() => {
    const refresh = () => {
      setTeamsState(getUiTeams())
      const id = readActiveTeamId()
      setActiveTeamId(prev => id || prev || (getUiTeams().list[0]?.id || null))
    }
    refresh()
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', refresh)
      window.addEventListener('fitspo:teams_changed', refresh)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', refresh)
        window.removeEventListener('fitspo:teams_changed', refresh)
      }
    }
  }, [getUiTeams])

  const activeTeam = React.useMemo(() => uiTeams.find(t => t.id === activeTeamId) || uiTeams[0], [uiTeams, activeTeamId])

  if (!activeTeam) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="p-1 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                {React.createElement(activeTeam.logo, { className: "size-4" })}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeTeam.name}</span>
                <span className="truncate text-xs">{activeTeam.plan}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Teams
            </DropdownMenuLabel>
            {uiTeams.map((team, index) => (
              <DropdownMenuItem
                key={team.id}
                onClick={() => {
                  setActiveTeamId(team.id)
                  if (!team.id.startsWith('fallback:')) {
                    writeActiveTeamId(team.id)
                  }
                }}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  {React.createElement(team.logo, { className: "size-3.5 shrink-0" })}
                </div>
                {team.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={() => { if (typeof window !== 'undefined') window.location.href = '/account?tab=team' }}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add team</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

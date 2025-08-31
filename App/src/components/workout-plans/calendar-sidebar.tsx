"use client"

import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Filter, Calendar as CalendarIcon, Users } from "lucide-react"
import { useMemo, useState } from "react"

type Account = { id: string; email: string; name?: string | null; color?: string | null }
type FilterUser = { id: string; name: string; email?: string | null; avatar?: string | null }
type WorkoutSpace = { id: string; name: string }

interface CalendarSidebarProps {
  collapsed: boolean
  accounts: Account[]
  visibleAccounts: Record<string, boolean>
  setVisibleAccounts: (next: Record<string, boolean>) => void
  users: FilterUser[]
  selectedUserIds: string[]
  setSelectedUserIds: (ids: string[]) => void
  spaces: WorkoutSpace[]
  selectedSpaceIds: string[]
  setSelectedSpaceIds: (ids: string[]) => void
}

export function CalendarSidebar({
  collapsed,
  accounts,
  visibleAccounts,
  setVisibleAccounts,
  users,
  selectedUserIds,
  setSelectedUserIds,
  spaces,
  selectedSpaceIds,
  setSelectedSpaceIds,
}: CalendarSidebarProps) {
  const [userQuery, setUserQuery] = useState("")
  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase()
    if (!q) return users
    return users.filter(u =>
      (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q)
    )
  }, [users, userQuery])
  const [spaceQuery, setSpaceQuery] = useState("")
  const filteredSpaces = useMemo(() => {
    const q = spaceQuery.trim().toLowerCase()
    if (!q) return spaces
    return spaces.filter(s => (s.name || "").toLowerCase().includes(q))
  }, [spaces, spaceQuery])

  const toggleUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter(x => x !== id))
    } else {
      setSelectedUserIds([...selectedUserIds, id])
    }
  }
  const toggleSpace = (id: string) => {
    if (selectedSpaceIds.includes(id)) {
      setSelectedSpaceIds(selectedSpaceIds.filter(x => x !== id))
    } else {
      setSelectedSpaceIds([...selectedSpaceIds, id])
    }
  }

  return (
    <div
      className={[
        collapsed
          ? 'hidden'
          : 'fixed inset-y-0 left-0 z-50 w-94 max-w-[85vw] shadow-lg lg:sticky lg:top-0 lg:self-start lg:w-73 lg:max-w-none',
        'border-r bg-background flex flex-col h-full lg:h-screen transition-all p-0'
      ].join(' ')}
    >
      <div className="p-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-6 w-6 text-primary" />
            {!collapsed && (
              <h2 className="text-sm font-semibold">Calendar Filters</h2>
            )}
          </div>
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-auto">
          <div className="p-2 space-y-5">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Connected Trainers</Label>
              <div className="space-y-2">
                {accounts.length === 0 ? (
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span>No connected accounts</span>
                  </div>
                ) : (
                  accounts.map((acc) => (
                    <div key={acc.id} className="space-y-1">
                      <Checkbox
                        checked={visibleAccounts[acc.id] !== false}
                        onCheckedChange={(checked) => setVisibleAccounts({ ...visibleAccounts, [acc.id]: Boolean(checked) })}
                        variant="chip"
                      >
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: acc.color || undefined }} />
                          <span className="flex-1 min-w-0">
                            <span className="block text-xs font-medium leading-tight truncate">{acc?.name || acc.email}</span>
                            <span className="block text-[10px] text-muted-foreground leading-tight truncate">{acc.email}</span>
                          </span>
                        </span>
                      </Checkbox>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Workout Spaces</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                      <span className="text-xs">{selectedSpaceIds.length > 0 ? `Selected: ${selectedSpaceIds.length}` : 'Select spaces'}</span>
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72 p-2" align="start">
                  <div className="space-y-2">
                    <Input
                      placeholder="Search spaces..."
                      value={spaceQuery}
                      onChange={(e) => setSpaceQuery(e.target.value)}
                      className="h-8"
                    />
                    <div className="max-h-60 overflow-auto rounded border">
                      {filteredSpaces.length === 0 ? (
                        <div className="text-xs text-muted-foreground p-2">No spaces found</div>
                      ) : (
                        <div className="p-2 space-y-2">
                          {filteredSpaces.map(s => (
                            <Checkbox
                              key={s.id}
                              checked={selectedSpaceIds.includes(s.id)}
                              onCheckedChange={() => toggleSpace(s.id)}
                              variant="chip"
                            >
                              <span className="inline-flex items-center gap-2 min-w-0">
                                <span className="flex-1 min-w-0">
                                  <span className="block text-xs font-medium leading-tight truncate">{s.name}</span>
                                </span>
                              </span>
                            </Checkbox>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedSpaceIds.length > 0 && (
                      <div className="flex justify-between pt-1">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedSpaceIds([])} className="h-7 px-2 text-xs">Clear</Button>
                        <div className="text:[10px] text-muted-foreground self-center">{selectedSpaceIds.length} selected</div>
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Users</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="inline-flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="text-xs">{selectedUserIds.length > 0 ? `Selected: ${selectedUserIds.length}` : 'Select users'}</span>
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72 p-2" align="start">
                  <div className="space-y-2">
                    <Input
                      placeholder="Search users..."
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      className="h-8"
                    />
                    <div className="max-h-60 overflow-auto rounded border">
                      {filteredUsers.length === 0 ? (
                        <div className="text-xs text-muted-foreground p-2">No users found</div>
                      ) : (
                        <div className="p-2 space-y-2">
                          {filteredUsers.map(u => (
                            <Checkbox
                              key={u.id}
                              checked={selectedUserIds.includes(u.id)}
                              onCheckedChange={() => toggleUser(u.id)}
                              variant="chip"
                            >
                              <span className="inline-flex items-center gap-2 min-w-0">
                                <span className="flex-1 min-w-0">
                                  <span className="block text-xs font-medium leading-tight truncate">{u.name}</span>
                                  {u.email && (
                                    <span className="block text-[10px] text-muted-foreground leading-tight truncate">{u.email}</span>
                                  )}
                                </span>
                              </span>
                            </Checkbox>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedUserIds.length > 0 && (
                      <div className="flex justify-between pt-1">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedUserIds([])} className="h-7 px-2 text-xs">Clear</Button>
                        <div className="text-[10px] text-muted-foreground self-center">{selectedUserIds.length} selected</div>
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Separator className="my-1" />
          </div>
        </div>
      )}
    </div>
  )
}



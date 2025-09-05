"use client"

import { useEffect, useMemo, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Search, User2 } from "lucide-react"
import { supabase } from '@/lib/supabaseClient'

type ManagedUserLite = { id: string; name: string | null; body_weight_kg: number | null; height_cm: number | null; age: number | null }

export function UserSwitcher({
  onSelected,
  className,
  contentClassName,
  align = 'start',
  side = 'bottom',
  sideOffset = 6,
  alignOffset = 0,
}: {
  onSelected?: (id: string) => void
  className?: string
  contentClassName?: string
  align?: 'start' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right'
  sideOffset?: number
  alignOffset?: number
}) {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<ManagedUserLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string>('')

  useEffect(() => {
    try {
      const s = typeof window !== 'undefined' ? (localStorage.getItem('fitspo:selected_user_id') || '') : ''
      setSelectedId(s)
    } catch {}
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const { data, error } = await supabase
          .from('managed_users')
          .select('id, name, body_weight_kg, height_cm, age')
          .order('updated_at', { ascending: false })
        if (error) throw error
        setUsers((data ?? []) as ManagedUserLite[])
      } catch (e) {
        setError('Failed to load users')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => (u.name || '').toLowerCase().includes(q))
  }, [users, search])

  const currentLabel = useMemo(() => {
    if (loading) return 'Loading users…'
    if (error) return 'Users unavailable'
    const u = users.find(u => u.id === selectedId)
    return u?.name || 'Select user'
  }, [loading, error, users, selectedId])

  const select = (id: string) => {
    setSelectedId(id)
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('fitspo:selected_user_id', id)
        // Notify same-tab listeners as storage does not fire in same tab
        window.dispatchEvent(new Event('fitspo:selected_user_changed'))
      }
    } catch {}
    onSelected?.(id)
  }

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-10 bg-background border-border hover:bg-accent hover:text-accent-foreground transition-colors min-w-[220px]">
            <span className="truncate font-medium flex items-center gap-2"><User2 className="h-4 w-4 opacity-70" />{currentLabel}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className={["w-[--radix-dropdown-menu-trigger-width] max-h-[350px] overflow-y-auto", contentClassName || ''].join(' ')}
          align={align}
          side={side}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
        >
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search users"
                placeholder="Search users…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                autoFocus
                className="pl-10 h-10 bg-background border-border hover:border-border/80 focus:border-primary"
              />
            </div>
          </div>
          <DropdownMenuSeparator />
          {loading ? (
            <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
          ) : error ? (
            <DropdownMenuItem disabled>{error}</DropdownMenuItem>
          ) : filtered.length === 0 ? (
            <DropdownMenuItem disabled>No users found</DropdownMenuItem>
          ) : (
            <DropdownMenuRadioGroup value={selectedId} onValueChange={select}>
              {filtered.map((u) => (
                <DropdownMenuRadioItem key={u.id} value={u.id} className="cursor-pointer py-3">
                  <div className="flex flex-col w-full">
                    <span className="font-medium text-sm">{u.name || 'Unnamed user'}</span>
                    <div className="text-xs text-muted-foreground">
                      {u.age != null ? `${u.age}y` : '—'} • {u.height_cm != null ? `${u.height_cm}cm` : '—'} • {u.body_weight_kg != null ? `${u.body_weight_kg}kg` : '—'}
                    </div>
                  </div>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}



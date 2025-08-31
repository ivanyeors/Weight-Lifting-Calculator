"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { UserSwitcher } from '@/components/user-switcher'
import { Search, RefreshCw, CheckCircle, AlertCircle, Cloud } from "lucide-react"

type SyncState = 'idle' | 'syncing' | 'success' | 'error'

interface WorkoutTemplatesSidebarProps {
  collapsed: boolean
  searchTerm: string
  setSearchTerm: (value: string) => void
  onSearch: () => void
  onReset: () => void
  syncStatus: SyncState
  onRefresh: () => void
}

export function WorkoutTemplatesSidebar({
  collapsed,
  searchTerm,
  setSearchTerm,
  onSearch,
  onReset,
  syncStatus,
  onRefresh,
}: WorkoutTemplatesSidebarProps) {
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
            <Search className="h-6 w-6 text-primary" />
            {!collapsed && (
              <h2 className="text-sm font-semibold">Filter Templates</h2>
            )}
          </div>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="flex-1 overflow-auto">
            <div className="p-2 space-y-5">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Active User</Label>
                <UserSwitcher />
              </div>

              <Separator className="my-1" />

              <div className="flex items-center justify-between">
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
                <Button size="icon" variant="ghost" className="h-8 w-8 p-0" aria-label="Refresh" onClick={onRefresh}>
                  <RefreshCw className={`h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Search Templates</Label>
                <Input
                  placeholder="Search template names..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div className="p-2 border-t">
            <div className="space-y-2">
              <Button 
                onClick={onSearch} 
                className="w-full"
                size="sm"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button 
                onClick={onReset} 
                variant="outline" 
                className="w-full"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

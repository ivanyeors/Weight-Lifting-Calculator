"use client"

import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Filter, Calendar as CalendarIcon } from "lucide-react"

type Account = { id: string; email: string; name?: string | null; color?: string | null }

interface CalendarSidebarProps {
  collapsed: boolean
  accounts: Account[]
  visibleAccounts: Record<string, boolean>
  setVisibleAccounts: (next: Record<string, boolean>) => void
}

export function CalendarSidebar({
  collapsed,
  accounts,
  visibleAccounts,
  setVisibleAccounts,
}: CalendarSidebarProps) {
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
              <Label className="text-sm font-medium">Google Accounts</Label>
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

            <Separator className="my-1" />
          </div>
        </div>
      )}
    </div>
  )
}



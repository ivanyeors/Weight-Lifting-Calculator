"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Filter, X } from "lucide-react"

interface ExerciseLibrarySidebarProps {
  collapsed: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
  onSearch: () => void
  onReset: () => void
}

export function ExerciseLibrarySidebar({
  collapsed,
  searchTerm,
  setSearchTerm,
  onSearch,
  onReset
}: ExerciseLibrarySidebarProps) {
  const [showFilters, setShowFilters] = useState(false)

  if (collapsed) {
    return null
  }

  return (
    <div className="w-80 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="search">Search Exercises</Label>
          <div className="flex gap-2">
            <Input
              id="search"
              placeholder="Search by name, muscle group..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
            <Button size="icon" onClick={onSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          {searchTerm && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-medium">Filter Options</h4>
            
            <div className="space-y-2">
              <Label>Muscle Groups</Label>
              <div className="space-y-2">
                {['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'].map((muscle) => (
                  <label key={muscle} className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">{muscle}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Equipment</Label>
              <div className="space-y-2">
                {['Bodyweight', 'Dumbbells', 'Barbell', 'Machine', 'Cable'].map((equipment) => (
                  <label key={equipment} className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">{equipment}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <div className="space-y-2">
                {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
                  <label key={level} className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">{level}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



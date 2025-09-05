"use client"

import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'

interface GoogleCalendarStatusProps {
  showEventCount?: boolean
  className?: string
}

export function GoogleCalendarStatus({ showEventCount = false, className = '' }: GoogleCalendarStatusProps) {
  const { isAuthenticated, events } = useGoogleCalendar({ autoSync: false })

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Calendar className="w-4 h-4 text-green-600" />
      <Badge variant="secondary" className="text-green-700 bg-green-100">
        {showEventCount ? `${events.length} events` : 'Google Calendar'}
      </Badge>
    </div>
  )
}

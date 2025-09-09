'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
//
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { ExerciseLibrarySidebar } from './exercise-library-sidebar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { useUserTier } from '@/hooks/use-user-tier'
import { supabase } from '@/lib/supabaseClient'
import { Plus, Edit2, Trash2, Dumbbell, Target, Activity, PanelLeft, PanelRight, RefreshCw, CheckCircle, AlertCircle, Cloud, Lock, XIcon } from 'lucide-react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { computeIdealWeight, type PersonalInputs } from '@/lib/idealWeight'
import { useSelectedUser } from '@/hooks/use-selected-user'
import { useIsMobile } from '@/hooks/use-mobile'
import { UpgradeModal } from '@/components/ui/upgrade-modal'

// Allowed workout types to be synced with Supabase
const ALLOWED_WORKOUT_TYPES: readonly string[] = [
  'Strength',
  'Speed and Power',
  'Agility and Coordination',
  'Stretching',
  'HIIT',
  'Functional',
  'Circuit',
  'Plyometrics',
  'Calisthenics',
  'Recovery',
  'Yoga',
  'Pilates',
  'Boxing',
  'Muay Thai',
  'Kickboxing',
  'Karate',
  'Taekwondo',
  'Jujitsu',
  'Wrestling',
  'Judo',
  'MMA',
  'Fencing',
  'Kendo',
  'Kung Fu (Wushu)',
  'Capoeira',
  'Aikido',
  'Sumo',
  'Aquatics',
  'Archery',
  'Badminton',
  'Basketball',
  'Beach Volleyball',
  'Breaking (breakdance)',
  'Canoe (Sprint & Slalom)',
  'Football',
  'Golf',
  'Gymnastics',
  'Handball',
  'Hockey',
  'Sport Climbing',
  'Swimming',
  'Tennis',
  'Table Tennis',
  'Weightlifting',
  'BodyWeight',
  'Cardio',
]

// Types
interface Exercise {
  id: string
  name: string
  description: string
  muscleGroups?: string[]
  workoutTypes?: string[]
  baseWeightFactor?: number
  muscleInvolvement?: Record<string, number>
  isCustom?: boolean
  userId?: string
  usageCount?: number
}

interface ExerciseFormData {
  name: string
  description: string
  muscleGroups: string[]
  workoutTypes: string[]
  baseWeightFactor: number
}

// Supabase row typing for custom_exercises table
interface SupabaseCustomExerciseRow {
  id: string
  user_id: string
  name: string
  description: string | null
  muscle_groups: string[] | null
  workout_types: string[] | null
  base_weight_factor: number | null
  muscle_involvement: Record<string, number> | null
  usage_count: number | null
}

export default function ExerciseLibraryPage() {
export default function Test() { return <div>Test</div>; }

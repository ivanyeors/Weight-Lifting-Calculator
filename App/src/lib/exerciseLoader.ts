// Simplified exercise data loader for local JSON files
// This file loads exercise data from local JSON files in the seed directory
import { supabase } from './supabaseClient'

export interface ExternalExercise {
  id: string
  name: string
  description: string
  muscleInvolvement: { [muscleName: string]: number }
  baseWeightFactor: number
}

export interface MuscleGroup {
  name: string
  category: string
}

export interface MuscleInvolvement {
  [muscleName: string]: number
}

interface PublicDataManifest {
  version: number
  generated: number
  files: Record<string, string>
}

/**
 * Load exercises from local complete_exercises.json file
 */
// Deprecated loaders retained for reference; no longer used after manifest adoption
export const loadExercisesFromLocalFile = async (): Promise<ExternalExercise[]> => {
  throw new Error('complete_exercises.json has been removed. Use manifest.json driven loading instead.')
}

/**
 * Load exercises by consulting public/manifest.json and merging the split files
 */
export const loadExercisesFromManifest = async (): Promise<ExternalExercise[]> => {
  // Helper to resolve URLs against Next.js base path (works for GitHub Pages subpath deploys)
  const publicUrl = (p: string) => {
    const path = `/${p.replace(/^\/+/, '')}`
    // Prefer explicit env base, otherwise try Next.js runtime assetPrefix in browser
    let base = process.env.NEXT_PUBLIC_BASE_URL || ''
    if (!base && typeof window !== 'undefined') {
      // __NEXT_DATA__.assetPrefix is set when basePath/assetPrefix are configured (e.g., GitHub Pages)
      const anyWindow = window as unknown as { __NEXT_DATA__?: { assetPrefix?: string } }
      base = anyWindow.__NEXT_DATA__?.assetPrefix || ''
    }
    if (!base) return path
    return `${base.replace(/\/+$/, '')}${path}`
  }
  // 1) Read manifest
  const manifestResponse = await fetch(publicUrl('manifest.json'))
  if (!manifestResponse.ok) {
    throw new Error(`Failed to fetch manifest.json: ${manifestResponse.status}`)
  }
  const manifest: PublicDataManifest = await manifestResponse.json()

  // 2) Resolve required file paths from manifest
  const metaPath = manifest.files?.['exercises_meta']
  const workoutTypesPath = manifest.files?.['exercises_workout_types']
  const trainingPath = manifest.files?.['exercises_training_data']

  if (!metaPath || !trainingPath) {
    throw new Error('Manifest is missing required exercise files (exercises_meta or exercises_training_data)')
  }

  // 3) Fetch in parallel
  const [metaRes, workoutRes, trainingRes] = await Promise.all([
    fetch(publicUrl(`${metaPath}`)),
    workoutTypesPath ? fetch(publicUrl(`${workoutTypesPath}`)) : Promise.resolve(new Response(JSON.stringify({ exercises: [] }))),
    fetch(publicUrl(`${trainingPath}`)),
  ])

  if (!metaRes.ok) throw new Error(`Failed to fetch ${metaPath}: ${metaRes.status}`)
  if (!trainingRes.ok) throw new Error(`Failed to fetch ${trainingPath}: ${trainingRes.status}`)
  if (workoutTypesPath && !workoutRes.ok) throw new Error(`Failed to fetch ${workoutTypesPath}: ${workoutRes.status}`)

  const [metaJson, , trainingJson] = await Promise.all([
    metaRes.json(),
    workoutRes.json(),
    trainingRes.json(),
  ])

  const metaList: Array<{ id: string; name: string; description: string }> = (
    (metaJson as { exercises?: Array<{ id: string; name: string; description: string }> }).exercises ??
    (metaJson as Array<{ id: string; name: string; description: string }>)
  )
  const trainingList: Array<{
    id: string
    muscleGroups?: string[]
    baseWeightFactor: number
    muscleInvolvement: MuscleInvolvement
  }> = (
    (trainingJson as { exercises?: Array<{ id: string; muscleGroups?: string[]; baseWeightFactor: number; muscleInvolvement: MuscleInvolvement }> }).exercises ??
    (trainingJson as Array<{ id: string; muscleGroups?: string[]; baseWeightFactor: number; muscleInvolvement: MuscleInvolvement }>)
  )

  // Workout types are loaded for potential future use, but not required for ExternalExercise
  const trainingById = new Map(trainingList.map((t) => [t.id, t]))

  const merged: ExternalExercise[] = metaList.map((m) => {
    const training = trainingById.get(m.id)
    if (!training) {
      throw new Error(`Missing training data for exercise id: ${m.id}`)
    }
    // workout types are not needed for ExternalExercise; ignore here
    return {
      id: m.id,
      name: m.name,
      description: m.description,
      muscleInvolvement: training.muscleInvolvement,
      baseWeightFactor: training.baseWeightFactor,
    }
  })

  return validateExerciseData(merged)
}

/**
 * Load exercises from Supabase (DB is the default SoR)
 * Falls back to manifest JSONs when DB is unreachable or empty.
 */
export const loadExercisesFromSupabase = async (): Promise<ExternalExercise[]> => {
	// 1) Fetch base exercise metadata
	const { data: exerciseRows, error: exercisesError } = await supabase
		.from('exercises')
		.select('id, name, description, base_weight_factor')
		.order('name', { ascending: true })

	if (exercisesError) throw exercisesError
	if (!exerciseRows || exerciseRows.length === 0) return []

	// 2) Fetch muscle involvement joined with muscle names
	const { data: involvementRows, error: involvementError } = await supabase
		.from('exercise_muscles')
		.select('exercise_id, involvement, muscles(name)')

	if (involvementError) throw involvementError

	// 3) Build a map of exercise_id -> { [muscleName]: involvement }
	const exerciseIdToInvolvement = new Map<string, Record<string, number>>()
	for (const row of involvementRows ?? []) {
		// @ts-expect-error - PostgREST nested select typing is loose here
		const muscleName: string | undefined = row.muscles?.name
		if (!muscleName) continue
		const map = exerciseIdToInvolvement.get(row.exercise_id) ?? {}
		map[muscleName] = row.involvement
		exerciseIdToInvolvement.set(row.exercise_id, map)
	}

	// If RLS blocks involvement rows, we'll end up with empty maps. Treat that as incomplete
	// so the caller can fall back to the public manifest JSON files. This preserves DB security
	// while ensuring the UI still renders full muscle involvement intensity and color.
	const hasAnyInvolvement = involvementRows && involvementRows.length > 0
	if (!hasAnyInvolvement) {
		return []
	}

	// 4) Merge into ExternalExercise shape
	const merged: ExternalExercise[] = exerciseRows.map((e) => ({
		id: e.id,
		name: e.name ?? e.id,
		description: e.description ?? '',
		baseWeightFactor: Number(e.base_weight_factor ?? 1.0),
		muscleInvolvement: exerciseIdToInvolvement.get(e.id) ?? {},
	}))

	return validateExerciseData(merged)
}

/**
 * Load exercises via SECURITY DEFINER RPC to safely bypass RLS for public fields
 */
export const loadExercisesFromRpc = async (): Promise<ExternalExercise[]> => {
  // get_public_exercises returns: id, name, description, base_weight_factor, muscle_involvement (jsonb)
  const { data, error } = await supabase.rpc('get_public_exercises')
  if (error) throw error

  const rows: Array<{
    id: string
    name: string | null
    description: string | null
    base_weight_factor: number | null
    muscle_involvement: Record<string, unknown> | null
  }> = (data as unknown) as Array<any>

  const mapped: ExternalExercise[] = (rows ?? []).map((r) => {
    const involvementRaw = (r.muscle_involvement || {}) as Record<string, unknown>
    const involvement: Record<string, number> = {}
    for (const [key, val] of Object.entries(involvementRaw)) {
      const n = Number(val)
      if (Number.isFinite(n)) involvement[key] = n
    }
    return {
      id: String(r.id),
      name: r.name ?? String(r.id),
      description: r.description ?? '',
      baseWeightFactor: Number(r.base_weight_factor ?? 1.0),
      muscleInvolvement: involvement,
    }
  })

  return validateExerciseData(mapped)
}

/**
 * Load muscle groups from local muscle_groups.json file
 */
export const loadMuscleGroupsFromLocalFile = async (): Promise<MuscleGroup[]> => {
  throw new Error('muscle_groups.json has been removed. Use manifest.json driven loading instead.')
}

/**
 * Load muscle involvement data from local muscle_Involvement.json file
 */
export const loadMuscleInvolvementFromLocalFile = async (): Promise<MuscleInvolvement> => {
  throw new Error('muscle_involvement.json has been removed. Use manifest.json driven loading instead.')
}

/**
 * Convert exercise data from strength_exercises.json format to ExternalExercise format
 * This function combines exercise data with muscle involvement data
 */
export const convertToExternalExerciseFormat = (
  exercises: unknown[], 
  muscleInvolvement: MuscleInvolvement
): ExternalExercise[] => {
  return exercises.map((exercise) => {
    // Type guard to ensure exercise has the expected structure
    if (typeof exercise !== 'object' || exercise === null) {
      throw new Error('Invalid exercise data structure')
    }
    
    const exerciseObj = exercise as Record<string, unknown>
    
    // Create muscle involvement object based on the exercise's muscle groups
    const involvement: { [muscleName: string]: number } = {}
    
    // Initialize all muscles with 0 involvement
    Object.keys(muscleInvolvement).forEach(muscle => {
      involvement[muscle] = 0
    })
    
    // Set involvement for muscles used in this exercise
    const muscleGroups = exerciseObj.muscleGroups
    if (muscleGroups && Array.isArray(muscleGroups)) {
      muscleGroups.forEach((muscleGroup: string) => {
        if (muscleInvolvement[muscleGroup] !== undefined) {
          involvement[muscleGroup] = muscleInvolvement[muscleGroup]
        }
      })
    }
    
    const name = String(exerciseObj.name || 'Unknown Exercise')
    const workoutTypes = exerciseObj.workoutTypes as string[] || ['Strength']
    
    return {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name: name,
      description: `${name} - ${workoutTypes.join(', ')} exercise`,
      muscleInvolvement: involvement,
      baseWeightFactor: 1.0 // Default factor, can be adjusted based on exercise type
    }
  })
}

/**
 * Load all exercise data from local files - now uses complete exercise data
 */
export const loadAllExerciseData = async (): Promise<ExternalExercise[]> => {
	// Strict DB-only loading via RPC. If unavailable or empty, throw to surface sync issues.
	const rpcData = await loadExercisesFromRpc()
	if (!rpcData || rpcData.length === 0) {
		throw new Error('No exercises available from database')
	}
	return rpcData
}

/**
 * Utility function to validate exercise data structure
 */
export const validateExerciseData = (data: unknown[]): ExternalExercise[] => {
  return data.filter((exercise): exercise is ExternalExercise => {
    if (typeof exercise !== 'object' || exercise === null) return false
    const e = exercise as Record<string, unknown>
    return (
      typeof e.id === 'string' &&
      typeof e.name === 'string' &&
      typeof e.description === 'string' &&
      typeof e.baseWeightFactor === 'number' &&
      typeof e.muscleInvolvement === 'object' && e.muscleInvolvement !== null
    )
  })
}

// Legacy function for backward compatibility
export const loadExercisesFromGitLabFolder = async (
  _projectPath: string,
  _folderPath: string,
  _branch: string = 'main',
  _accessToken?: string
): Promise<ExternalExercise[]> => {
  // Mark unused variables as used to satisfy lint rules
  void _projectPath; void _folderPath; void _branch; void _accessToken
  console.warn('GitLab loading is deprecated. Using local file loading instead.')
  return loadAllExerciseData()
}

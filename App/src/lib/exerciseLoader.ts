// Simplified exercise data loader for local JSON files
// This file loads exercise data from local JSON files in the seed directory

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
  const publicUrl = (p: string) => `${process.env.NEXT_PUBLIC_BASE_URL || ''}${p.replace(/^\/+/, '')}`
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
  try {
    // Prefer manifest-based loading
    return await loadExercisesFromManifest()
  } catch (error) {
    console.error('All loading methods failed (manifest missing or invalid):', error)
    throw error
  }
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
  console.warn('GitLab loading is deprecated. Using local file loading instead.')
  return loadAllExerciseData()
}

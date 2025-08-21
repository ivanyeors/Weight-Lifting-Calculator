export type Gender = 'male' | 'female'

export type ExperienceCategory = 'cat1' | 'cat2' | 'cat3' | 'cat4' | 'cat5'

export interface PersonalInputs {
  bodyWeight: number
  height: number
  age: number
  gender: Gender
  experience: ExperienceCategory
  skeletalMuscleMass: number
  bodyFatMass: number
}

export const experienceFactors: Record<ExperienceCategory, { factor: number; label: string }> = {
  cat1: { factor: 0.6, label: 'Cat I (Beginner, 0-6 months)' },
  cat2: { factor: 0.7, label: 'Cat II (Novice, 6-12 months)' },
  cat3: { factor: 0.8, label: 'Cat III (Intermediate, 1-2 years)' },
  cat4: { factor: 0.9, label: 'Cat IV (Advanced, 3-4 years)' },
  cat5: { factor: 1.0, label: 'Cat V (Elite, 5+ years)' },
}

export function computeIdealWeight(inputs: PersonalInputs, exerciseBaseFactor: number): number {
  const genderFactor = inputs.gender === 'male' ? 1.0 : 0.9
  const ageFactor = inputs.age <= 30 ? 1.0 : 1 - 0.01 * (inputs.age - 30)
  const expFactor = experienceFactors[inputs.experience]?.factor ?? 0.8

  const averageHeight = inputs.gender === 'male' ? 175 : 162
  const heightInfluence = 0.0025
  const heightRaw = 1 - heightInfluence * (inputs.height - averageHeight)
  const heightFactor = Math.max(0.85, Math.min(1.15, heightRaw))

  const w = inputs.bodyWeight
  const f = Math.min(Math.max(0, inputs.bodyFatMass), Math.max(0.0001, w))
  const fatFrac = w > 0 ? f / w : 0
  const fatInfluence = 0.5
  const fatRaw = 1 - fatInfluence * fatFrac
  const fatFactor = Math.max(0.7, Math.min(1.1, fatRaw))

  const smm = Math.max(0, inputs.skeletalMuscleMass)
  const exFactor = Number.isFinite(exerciseBaseFactor) ? exerciseBaseFactor : 1

  return smm * genderFactor * ageFactor * expFactor * fatFactor * heightFactor * exFactor
}



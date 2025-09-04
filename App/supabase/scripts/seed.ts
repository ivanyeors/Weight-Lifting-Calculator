import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'
import path from 'node:path'

// Load env from .env.local if present (preferred), then fallback to .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined

if (!SUPABASE_URL) {
	console.error('Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL')
	process.exit(1)
}

const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
if (!key) {
	console.error('Missing Supabase env: set SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY')
	process.exit(1)
}

const supabase = createClient(SUPABASE_URL, key)

async function readJson<T>(file: string): Promise<T> {
	const full = path.resolve(process.cwd(), 'supabase', 'seed', file)
	const raw = await fs.readFile(full, 'utf8')
	return JSON.parse(raw) as T
}

const CANONICAL_WORKOUT_TYPES: readonly string[] = [
	'Strength','Speed and Power','Agility and Coordination','Stretching','HIIT','Functional','Circuit','Plyometrics','Calisthenics','Recovery','Yoga','Pilates','Boxing','Muay Thai','Kickboxing','Karate','Taekwondo','Jujitsu','Wrestling','Judo','MMA','Fencing','Kendo','Kung Fu (Wushu)','Capoeira','Aikido','Sumo','Aquatics','Archery','Badminton','Basketball','Beach Volleyball','Breaking (breakdance)','Canoe (Sprint & Slalom)','Football','Golf','Gymnastics','Handball','Hockey','Sport Climbing','Swimming','Tennis','Table Tennis','Weightlifting','BodyWeight','Cardio'
] as const

async function upsertWorkoutTypes(exercises: Array<{ id: string; workoutTypes?: string[] }>) {
	const unique = new Set<string>(CANONICAL_WORKOUT_TYPES)
	for (const e of exercises) {
		for (const wt of e.workoutTypes ?? []) unique.add(wt)
	}
	const rows = Array.from(unique).map((name) => ({ name }))
	if (rows.length === 0) return
	const { error } = await supabase.from('workout_types').upsert(rows, { onConflict: 'name' })
	if (error) throw error
}

async function fetchWorkoutTypes(): Promise<Record<string, string>> {
	const { data, error } = await supabase.from('workout_types').select('id, name')
	if (error) throw error
	return Object.fromEntries((data ?? []).map((r) => [r.name, r.id]))
}

async function upsertExercises(meta: Array<{ id: string; name: string; description: string }>, training: Array<{ id: string; baseWeightFactor: number }>) {
	const trainingById = new Map(training.map((t) => [t.id, t]))
	const rows = meta.map((m) => ({
		id: m.id,
		name: m.name,
		description: m.description,
		base_weight_factor: trainingById.get(m.id)?.baseWeightFactor ?? 1.0,
		source: 'system' as const,
	}))
	const { error } = await supabase.from('exercises').upsert(rows, { onConflict: 'id' })
	if (error) throw error
}

async function upsertMuscles(training: Array<{ muscleInvolvement: Record<string, number> }>) {
	const unique = new Set<string>()
	for (const t of training) for (const name of Object.keys(t.muscleInvolvement)) unique.add(name)
	const rows = Array.from(unique).map((name) => ({ name }))
	if (rows.length === 0) return
	const { error } = await supabase.from('muscles').upsert(rows, { onConflict: 'name' })
	if (error) throw error
}

async function fetchMuscles(): Promise<Record<string, string>> {
	const { data, error } = await supabase.from('muscles').select('id, name')
	if (error) throw error
	return Object.fromEntries((data ?? []).map((r) => [r.name, r.id]))
}

async function upsertExerciseMuscles(training: Array<{ id: string; muscleInvolvement: Record<string, number> }>, muscleNameToId: Record<string, string>) {
	const rows: Array<{ exercise_id: string; muscle_id: string; involvement: number }> = []
	for (const t of training) {
		for (const [muscleName, score] of Object.entries(t.muscleInvolvement)) {
			if (!score || score <= 0) continue // skip zeros/negatives
			const muscle_id = muscleNameToId[muscleName]
			if (!muscle_id) continue
			rows.push({ exercise_id: t.id, muscle_id, involvement: score })
		}
	}
	if (rows.length === 0) return
	const { error } = await supabase.from('exercise_muscles').upsert(rows, { onConflict: 'exercise_id,muscle_id' })
	if (error) throw error
}

async function upsertExerciseWorkoutTypes(exercises: Array<{ id: string; workoutTypes?: string[] }>, workoutTypeNameToId: Record<string, string>) {
	const rows: Array<{ exercise_id: string; workout_type_id: string }> = []
	for (const e of exercises) {
		for (const name of e.workoutTypes ?? []) {
			const workout_type_id = workoutTypeNameToId[name]
			if (!workout_type_id) continue
			rows.push({ exercise_id: e.id, workout_type_id })
		}
	}
	if (rows.length === 0) return
	const { error } = await supabase.from('exercise_workout_types').upsert(rows, { onConflict: 'exercise_id,workout_type_id' })
	if (error) throw error
}

async function upsertEquipment(equipment: Array<{ name: string; category?: string; aliases?: string[] }>) {
	if (equipment.length === 0) return
	const rows = equipment.map((e) => ({ name: e.name, category: e.category ?? null, aliases: e.aliases ?? [] }))
	const { error } = await supabase.from('equipment').upsert(rows, { onConflict: 'name' })
	if (error) throw error
}

async function fetchEquipment(): Promise<Record<string, string>> {
	const { data, error } = await supabase.from('equipment').select('id, name')
	if (error) throw error
	return Object.fromEntries((data ?? []).map((r) => [r.name, r.id]))
}

async function upsertExerciseEquipment(mappings: Array<{ exercise_id: string; equipment: string[] }>, equipmentNameToId: Record<string, string>) {
	const rows: Array<{ exercise_id: string; equipment_id: string; is_required: boolean }> = []
	for (const m of mappings) {
		for (const name of m.equipment) {
			const equipment_id = equipmentNameToId[name]
			if (!equipment_id) continue
			rows.push({ exercise_id: m.exercise_id, equipment_id, is_required: true })
		}
	}
	if (rows.length === 0) return
	const { error } = await supabase.from('exercise_equipment').upsert(rows, { onConflict: 'exercise_id,equipment_id' })
	if (error) throw error
}

// Foods seed
async function upsertFoods(foods: Array<{ name: string; category?: string; unit_kind: 'mass'|'volume'|'count'; carbs?: number; fats?: number; protein?: number; carbs_per_100?: number; fats_per_100?: number; protein_per_100?: number; micros?: Record<string, number> }>) {
	if (foods.length === 0) return
	const rows = foods.map(f => {
		// Support new schema (carbs/fats/protein) and legacy (carbs_per_100/fats_per_100/protein_per_100)
		const isCount = f.unit_kind === 'count'
		const carbsPer100 = f.carbs_per_100 != null
			? f.carbs_per_100
			: (f.carbs != null ? (isCount ? f.carbs * 100 : f.carbs) : 0)
		const fatsPer100 = f.fats_per_100 != null
			? f.fats_per_100
			: (f.fats != null ? (isCount ? f.fats * 100 : f.fats) : 0)
		const proteinPer100 = f.protein_per_100 != null
			? f.protein_per_100
			: (f.protein != null ? (isCount ? f.protein * 100 : f.protein) : 0)
		return {
			name: f.name,
			category: f.category ?? null,
			unit_kind: f.unit_kind,
			carbs_per_100: carbsPer100,
			fats_per_100: fatsPer100,
			protein_per_100: proteinPer100,
			micros: f.micros ?? {}
		}
	})
	const { error } = await supabase.from('foods').upsert(rows, { onConflict: 'name' })
	if (error) throw error
}

// Recipes seed
type RecipesJson = {
	recipes: Array<{
		recipe_key: string
		name: string
		base_servings: number
		diets: string[]
		category?: string | null
		calories_per_serving?: number
		macros_per_serving?: { carbs?: number; fats?: number; protein?: number }
		micros_per_serving?: Record<string, number>
		ingredients: Array<{ name: string; quantity_amount: number; quantity_unit: string }>
	}>
}

async function upsertRecipesWithIngredients(recipes: RecipesJson['recipes']) {
	if (!recipes || recipes.length === 0) return

	// Preload foods referenced by name to map -> id
	const allFoodNames = Array.from(new Set(recipes.flatMap(r => r.ingredients.map(i => i.name))))
	let foodNameToId: Record<string, string> = {}
	if (allFoodNames.length > 0) {
		const { data: foodsRows, error: foodsErr } = await supabase
			.from('foods')
			.select('id, name')
			.in('name', allFoodNames)
		if (foodsErr) throw foodsErr
		foodNameToId = Object.fromEntries((foodsRows ?? []).map(r => [r.name as string, r.id as string]))
	}

	for (const r of recipes) {
		const { data: recRow, error: recErr } = await supabase
			.from('nutrition_recipes')
			.upsert({
				recipe_key: r.recipe_key,
				name: r.name,
				base_servings: r.base_servings,
				diets: r.diets,
				category: r.category ?? null,
				calories_per_serving: r.calories_per_serving ?? 0,
				macros_per_serving: r.macros_per_serving ?? {},
				micros_per_serving: r.micros_per_serving ?? {}
			}, { onConflict: 'recipe_key' })
			.select('id')
			.single()
		if (recErr) throw recErr
		const recipe_id = recRow.id as string

		for (const ing of r.ingredients) {
			const row = {
				recipe_id,
				food_id: foodNameToId[ing.name] ?? null,
				name: ing.name,
				quantity_amount: ing.quantity_amount,
				quantity_unit: ing.quantity_unit
			}
			const { error: ingErr } = await supabase
				.from('nutrition_recipe_ingredients')
				.upsert(row, { onConflict: 'recipe_id,name' })
			if (ingErr) throw ingErr
		}
	}
}

async function main() {
	const meta = (await readJson<{ exercises: Array<{ id: string; name: string; description: string }> }>('exercises_meta.json')).exercises
	const training = (await readJson<{ exercises: Array<{ id: string; baseWeightFactor: number; muscleInvolvement: Record<string, number> }> }>('exercises_training_data.json')).exercises
	const workout = (await readJson<{ exercises: Array<{ id: string; workoutTypes?: string[] }> }>('exercises_workout_types.json')).exercises
	const equipmentSeed = await readJson<{ equipment: Array<{ name: string; category?: string; aliases?: string[] }>; exercise_equipment: Array<{ exercise_id: string; equipment: string[] }> }>('equipment.json')

	await upsertWorkoutTypes(workout)
	const workoutNameToId = await fetchWorkoutTypes()

	await upsertExercises(meta, training)
	await upsertMuscles(training)
	const muscleNameToId = await fetchMuscles()

	await upsertExerciseMuscles(training, muscleNameToId)
	await upsertExerciseWorkoutTypes(workout, workoutNameToId)

	await upsertEquipment(equipmentSeed.equipment)
	const equipmentNameToId = await fetchEquipment()
	await upsertExerciseEquipment(equipmentSeed.exercise_equipment, equipmentNameToId)

	// Foods - Load from category-specific files for better scalability
	try {
		const categoryFiles = [
			'vegetables.json',
			'fruits.json',
			'meat.json',
			'dairy_eggs.json',
			'seafood.json',
			'condiments.json',
			'grains.json',
			'beans.json',
			'spices.json',
			'nuts_seeds.json',
			'beverages.json'
		]

		const allFoods: Array<{ name: string; category?: string; unit_kind: 'mass'|'volume'|'count'; carbs_per_100: number; fats_per_100: number; protein_per_100: number; micros?: Record<string, number> }> = []

		for (const file of categoryFiles) {
			try {
				const categorySeed = await readJson<{ foods: Array<{ name: string; category?: string; unit_kind: 'mass'|'volume'|'count'; carbs_per_100: number; fats_per_100: number; protein_per_100: number; micros?: Record<string, number> }> }>(file)
				allFoods.push(...categorySeed.foods)
				console.log(`Loaded ${categorySeed.foods.length} foods from ${file}`)
			} catch (fileErr) {
				console.warn(`Failed to load ${file}:`, fileErr)
			}
		}

		if (allFoods.length > 0) {
			await upsertFoods(allFoods)
			console.log(`Successfully seeded ${allFoods.length} foods from ${categoryFiles.length} category files`)
		} else {
			console.warn('No foods loaded from category files; skipping foods seed')
		}
	} catch (e) {
		console.warn('Failed to load foods from category files; skipping foods seed:', e)
	}

	// Recipes - Load from diet-specific files for better scalability
	try {
		const dietCategoryFiles = [
			'balanced_diet_recipes.json',
			'high_protein_diet_recipes.json',
			'keto_diet_recipes.json',
			'low_carb_diet_recipes.json',
			'mediterranean_diet_recipes.json',
			'vegan_diet_recipes.json',
			'vegetarian_diet_recipes.json'
		]

		const allRecipes: RecipesJson['recipes'] = []

		for (const file of dietCategoryFiles) {
			try {
				const categorySeed = await readJson<RecipesJson>(file)
				allRecipes.push(...categorySeed.recipes)
				console.log(`Loaded ${categorySeed.recipes.length} recipes from ${file}`)
			} catch (fileErr) {
				console.warn(`Failed to load ${file}:`, fileErr)
			}
		}

		if (allRecipes.length > 0) {
			await upsertRecipesWithIngredients(allRecipes)
			console.log(`Successfully seeded ${allRecipes.length} recipes from ${dietCategoryFiles.length} diet category files`)
		} else {
			console.warn('No recipes loaded from diet category files; skipping recipes seed')
		}
	} catch (e) {
		console.warn('Failed to load recipes from diet category files; skipping recipes seed:', e)
	}

	console.log('Seed completed')
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})

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

async function updateFoodAliases() {
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

	let updatedCount = 0

	for (const file of categoryFiles) {
		try {
			const categorySeed = await readJson<{ foods: Array<{ name: string; aliases?: string[] }> }>(file)

			for (const food of categorySeed.foods) {
				if (food.aliases && food.aliases.length > 0) {
					const { error } = await supabase
						.from('foods')
						.update({ aliases: food.aliases })
						.eq('name', food.name)

					if (error) {
						console.warn(`Failed to update aliases for ${food.name}:`, error)
					} else {
						updatedCount++
						console.log(`Updated aliases for ${food.name}: [${food.aliases.join(', ')}]`)
					}
				}
			}
		} catch (fileErr) {
			console.warn(`Failed to load ${file}:`, fileErr)
		}
	}

	console.log(`Successfully updated aliases for ${updatedCount} foods`)
}

updateFoodAliases().catch((err) => {
	console.error(err)
	process.exit(1)
})

import fs from 'fs';

try {
  const dietTypes = new Set();

  // Get all recipe files
  const files = fs.readdirSync('supabase/seed/').filter(f => f.endsWith('_recipes.json'));

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(`supabase/seed/${file}`, 'utf8'));

    for (const recipe of data.recipes) {
      if (recipe.diets && Array.isArray(recipe.diets)) {
        recipe.diets.forEach(diet => dietTypes.add(diet));
      }
    }
  }

  console.log('Found diet types:');
  Array.from(dietTypes).sort().forEach(diet => {
    console.log(`- ${diet}`);
  });

  console.log(`\nTotal unique diet types: ${dietTypes.size}`);

} catch (error) {
  console.error('Error extracting diets:', error);
}

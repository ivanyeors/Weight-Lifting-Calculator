import fs from 'fs';

try {
  const recipes = JSON.parse(fs.readFileSync('supabase/seed/recipes.json', 'utf8'));

  const dietTypes = [
    'Balanced',
    'DASH',
    'Dairy Free',
    'Gluten Free',
    'High Protein',
    'Keto',
    'Low Carb',
    'Low FODMAP',
    'Low Sodium',
    'Mediterranean',
    'Paleo',
    'Pescatarian',
    'Vegan',
    'Vegetarian'
  ];

  const dietCategories = {};

  // Initialize categories
  dietTypes.forEach(diet => {
    dietCategories[diet] = [];
  });

  for (const recipe of recipes.recipes) {
    // Update category to primary diet type
    if (recipe.diets && Array.isArray(recipe.diets) && recipe.diets.length > 0) {
      // Prefer "Balanced" if it's in the diets, otherwise use first diet
      const primaryDiet = recipe.diets.includes('Balanced') ? 'Balanced' : recipe.diets[0];

      // Only use diet types we're tracking (exclude cuisine types)
      if (dietTypes.includes(primaryDiet)) {
        recipe.category = primaryDiet;
        dietCategories[primaryDiet].push(recipe);
      } else {
        // For cuisine types, put them in a general "Balanced" category or create a fallback
        recipe.category = 'Balanced';
        dietCategories['Balanced'].push(recipe);
      }
    } else {
      // If no diets specified, put in Balanced
      recipe.category = 'Balanced';
      dietCategories['Balanced'].push(recipe);
    }
  }

  // Create new category files
  Object.entries(dietCategories).forEach(([dietType, recipes]) => {
    if (recipes.length > 0) {
      const filename = dietType.toLowerCase().replace(/\s+/g, '_') + '_diet_recipes.json';
      fs.writeFileSync(`supabase/seed/${filename}`, JSON.stringify({ recipes }, null, 2));
      console.log(`Created ${filename} with ${recipes.length} recipes for ${dietType} diet`);
    }
  });

  console.log('\nRecipe reorganization by diet type completed successfully!');

} catch (error) {
  console.error('Error recreating diet recipes:', error);
}

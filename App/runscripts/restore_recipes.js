import fs from 'fs';

// Since I accidentally deleted the diet recipe files, let me recreate them from the original recipes.json
try {
  // First, let me recreate the original recipes.json from the backup or from git
  console.log('Please restore the original recipes.json file first, then run the reorganization script again.');
  console.log('You can find the original recipes.json in the git history or from a backup.');

  // For now, let me check if there's any recipes data available
  const files = fs.readdirSync('supabase/seed/');
  const hasRecipes = files.some(f => f.includes('recipes'));

  if (!hasRecipes) {
    console.log('No recipe files found. You need to restore recipes.json first.');
  }

} catch (error) {
  console.error('Error:', error);
}

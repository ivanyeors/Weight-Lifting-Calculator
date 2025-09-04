import fs from 'fs';

try {
  const foods = JSON.parse(fs.readFileSync('supabase/seed/foods.json', 'utf8'));

  const categories = {};
  foods.foods.forEach(food => {
    const cat = food.category || 'Uncategorized';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(food);
  });

  Object.entries(categories).forEach(([category, foods]) => {
    const filename = category.toLowerCase().replace(/[&\s]+/g, '_').replace(/[^a-z0-9_]/g, '') + '.json';
    fs.writeFileSync(`supabase/seed/${filename}`, JSON.stringify({ foods }, null, 2));
    console.log(`Created ${filename} with ${foods.length} items`);
  });

  console.log('Food splitting completed successfully!');
} catch (error) {
  console.error('Error splitting foods:', error);
}

import fs from 'fs';
import path from 'path';

// Read all food files
const files = ['vegetables.json', 'fruits.json', 'grains.json', 'condiments.json', 'spices.json', 'nuts_seeds.json', 'dairy_eggs.json', 'beans.json', 'meat.json', 'seafood.json', 'beverages.json'];

const allFoods = new Map();
const duplicates = new Map();

files.forEach(file => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join('supabase', 'seed', file), 'utf8'));
    if (data.foods) {
      data.foods.forEach(food => {
        const name = food.name;
        if (allFoods.has(name)) {
          if (!duplicates.has(name)) {
            duplicates.set(name, [allFoods.get(name)]);
          }
          duplicates.get(name).push({ file, category: food.category, unit_kind: food.unit_kind });
        } else {
          allFoods.set(name, { file, category: food.category, unit_kind: food.unit_kind });
        }
      });
    }
  } catch (e) {
    // ignore missing files
  }
});

console.log('Duplicate foods found:');
for (const [name, entries] of duplicates) {
  console.log(`${name}:`);
  entries.forEach(entry => {
    console.log(`  - ${entry.file}: category='${entry.category}', unit_kind='${entry.unit_kind}'`);
  });
}
console.log(`Total duplicates: ${duplicates.size}`);

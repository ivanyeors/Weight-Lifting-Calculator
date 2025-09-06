import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkFoods() {
  // Check Avocado
  const { data: avocadoData, error: avocadoError } = await supabase
    .from('foods')
    .select('name, category')
    .eq('name', 'Avocado')
    .limit(5);

  if (avocadoError) {
    console.error('Avocado Error:', avocadoError);
  } else {
    console.log('Avocado entries in database:', avocadoData);
  }

  // Check some of our newly added ingredients
  const newFoods = ['Tofu', 'Nutritional yeast', 'Coconut milk', 'Kimchi'];
  for (const food of newFoods) {
    const { data: foodData, error: foodError } = await supabase
      .from('foods')
      .select('name, category')
      .eq('name', food)
      .limit(1);

    if (!foodError && foodData && foodData.length > 0) {
      console.log(`${food}: ${foodData[0].category}`);
    } else if (foodError) {
      console.error(`Error checking ${food}:`, foodError);
    } else {
      console.log(`${food}: Not found in database`);
    }
  }

  process.exit(0);
}

checkFoods().catch(console.error);

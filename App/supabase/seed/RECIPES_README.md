# Recipes Data Structure - Scalable Diet-Based Organization

## Overview

The recipes data has been reorganized from meal-based categories to **diet-based categories** for better scalability and maintainability. Each recipe's category now represents its primary diet type rather than meal time.

## File Structure

```
supabase/seed/
├── balanced_diet_recipes.json      (18 recipes)
├── high_protein_diet_recipes.json  (2 recipes)
├── keto_diet_recipes.json          (1 recipes)
├── low_carb_diet_recipes.json      (1 recipes)
├── mediterranean_diet_recipes.json (1 recipes)
├── vegan_diet_recipes.json         (18 recipes - largest)
└── vegetarian_diet_recipes.json    (1 recipes)
```

## Benefits

1. **Better Organization**: Recipes logically grouped by diet type
2. **Improved Maintainability**: Easier to update specific diet categories
3. **Faster Development**: Smaller files load faster during development
4. **Scalability**: Easy to add new diet categories
5. **Version Control**: More granular changes in git history
6. **Diet-Specific Filtering**: Users can easily find recipes matching their dietary preferences

## Total Recipes by Diet Category

- **Balanced**: 18 recipes (most versatile recipes)
- **Vegan**: 18 recipes (largest category - plant-based options)
- **High Protein**: 2 recipes
- **Keto**: 1 recipes
- **Low Carb**: 1 recipes
- **Mediterranean**: 1 recipes
- **Vegetarian**: 1 recipes

**Total: 42 recipes**

## Diet Categories Explained

### Balanced (18 recipes)
- General healthy recipes suitable for most people
- Often include cuisine-specific recipes that don't fit other diet categories
- Good starting point for most users

### Vegan (18 recipes)
- Plant-based recipes with no animal products
- Largest category reflecting growing demand for plant-based options
- Includes vegan alternatives and traditional plant-based dishes

### High Protein (2 recipes)
- Recipes focused on protein content
- Suitable for athletes, bodybuilders, and those building muscle

### Keto (1 recipes)
- Low-carb, high-fat recipes
- Designed for ketogenic diet followers

### Low Carb (1 recipes)
- Reduced carbohydrate content
- Suitable for low-carb diet approaches

### Mediterranean (1 recipes)
- Traditional Mediterranean diet recipes
- Emphasize healthy fats, vegetables, and lean proteins

### Vegetarian (1 recipes)
- Recipes without meat but may include dairy and eggs
- Plant-focused but not necessarily vegan

## Technical Implementation

### Seeding Process
The `supabase/scripts/seed.ts` file has been updated to:
1. Load all recipe category files dynamically
2. Combine them into a single array for database insertion
3. Provide detailed logging of loading progress
4. Handle missing files gracefully

### Data Consistency
- All recipes maintain the same database schema
- Category information is preserved in each recipe record
- No changes required to frontend components
- RecipeCards.tsx continues to work without modifications

### File Format
Each recipe category file follows the same JSON structure:
```json
{
  "recipes": [
    {
      "recipe_key": "unique-recipe-identifier",
      "name": "Recipe Name",
      "category": "Category Name",
      "base_servings": 2,
      "diets": ["Diet1", "Diet2"],
      "calories_per_serving": 535,
      "macros_per_serving": { "carbs": 52, "protein": 38, "fats": 18 },
      "micros_per_serving": {
        "sodium": 380,
        "potassium": 1250,
        "fiber": 7,
        ...
      },
      "ingredients": [
        { "name": "Ingredient Name", "quantity_amount": 200, "quantity_unit": "g" }
      ]
    }
  ]
}
```

## Adding New Recipes

### To Existing Diet Category
1. Open the appropriate diet category file (e.g., `vegan_diet_recipes.json`)
2. Add the new recipe object to the `recipes` array
3. Ensure `recipe_key` is unique across all recipe files
4. Set the `category` field to match the diet type
5. Run the seeding script: `npm run db:seed`

### To New Diet Category
1. Create a new recipe file following the naming convention: `diet_name_diet_recipes.json`
2. Add the category file to the `dietCategoryFiles` array in `supabase/scripts/seed.ts`
3. Add recipes following the established format with appropriate diet type in `category`
4. Run the seeding script

### Recipe Category Assignment
When adding recipes, set the `category` field to the primary diet type from this list:
- `Balanced`, `High Protein`, `Keto`, `Low Carb`, `Mediterranean`, `Vegan`, `Vegetarian`
- Use `Balanced` for general healthy recipes or cuisine-specific recipes
- Choose the most specific diet type that applies (e.g., `Vegan` over `Vegetarian`)

## Migration Notes

- The original `recipes.json` file has been replaced by category-specific files
- All existing functionality remains intact
- No database schema changes were required
- Frontend components work without modification
- The seeding process is backward-compatible


## Future Improvements

1. **Automated Validation**: Add schema validation for recipe category files
2. **Recipe Metadata**: Add preparation time, difficulty level, cuisine type
3. **Ingredient Optimization**: Implement ingredient availability checking
4. **Dynamic Loading**: Load recipe categories on-demand in the frontend
5. **Search Enhancement**: Add category-based recipe search indexing

## Troubleshooting

### Missing Recipes
If recipes are not appearing in the application:
1. Check that the category file is included in `seed.ts`
2. Verify the JSON syntax is valid
3. Ensure `recipe_key` values are unique across all files
4. Run the seeding script and check for errors
5. Check Supabase logs for database insertion errors

### Performance Issues
If loading is slow:
1. Consider splitting large categories further (e.g., split vegan into subcategories)
2. Implement lazy loading for recipe categories
3. Add database indexes on frequently queried recipe fields
4. Cache recipe data in the application

### Diet Category Issues
If recipes aren't showing in the correct diet categories:
1. Verify the `category` field in the recipe matches the diet type exactly
2. Check that the diet type is in the `dietCategoryFiles` array in `seed.ts`
3. Ensure the recipe file follows the naming convention: `diet_name_diet_recipes.json`

### Ingredient Mapping Issues
If ingredients are not linking properly:
1. Ensure ingredient names in recipes match food names in the database
2. Check for case sensitivity in ingredient names
3. Verify that referenced foods exist in the foods tables
4. Review seeding logs for food name mapping warnings

## Integration with Foods

Recipes automatically link to foods through the seeding process:
1. All ingredients in recipes are matched to foods by name
2. If a food doesn't exist, the ingredient will be created as a reference
3. Nutritional calculations use the linked food data
4. IngredientList.tsx can display recipe ingredients seamlessly

This scalable structure ensures both foods and recipes can grow independently while maintaining perfect integration.

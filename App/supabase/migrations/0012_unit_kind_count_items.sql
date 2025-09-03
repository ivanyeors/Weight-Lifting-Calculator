-- Align unit_kind to 'count' for items typically bought per piece
-- For count items, macros columns are stored per 100 pieces.
-- Convert existing rows that were previously per 100g by multiplying by average grams per piece.

-- Egg: ~50 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 50,
    fats_per_100 = fats_per_100 * 50,
    protein_per_100 = protein_per_100 * 50
where name = 'Egg' and unit_kind <> 'count';

-- Avocado: ~150 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 150,
    fats_per_100 = fats_per_100 * 150,
    protein_per_100 = protein_per_100 * 150
where name = 'Avocado' and unit_kind <> 'count';

-- Bell pepper (red): ~120 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 120,
    fats_per_100 = fats_per_100 * 120,
    protein_per_100 = protein_per_100 * 120
where name = 'Bell pepper (red)' and unit_kind <> 'count';

-- Bell pepper (green): ~120 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 120,
    fats_per_100 = fats_per_100 * 120,
    protein_per_100 = protein_per_100 * 120
where name = 'Bell pepper (green)' and unit_kind <> 'count';

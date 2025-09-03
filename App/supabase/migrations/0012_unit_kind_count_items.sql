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

-- Apple: ~182 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 182,
    fats_per_100 = fats_per_100 * 182,
    protein_per_100 = protein_per_100 * 182
where name = 'Apple' and unit_kind <> 'count';

-- Dragon fruit: ~350 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 350,
    fats_per_100 = fats_per_100 * 350,
    protein_per_100 = protein_per_100 * 350
where name = 'Dragon fruit' and unit_kind <> 'count';

-- Grapefruit: ~230 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 230,
    fats_per_100 = fats_per_100 * 230,
    protein_per_100 = protein_per_100 * 230
where name = 'Grapefruit' and unit_kind <> 'count';

-- Guava: ~100 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 100,
    fats_per_100 = fats_per_100 * 100,
    protein_per_100 = protein_per_100 * 100
where name = 'Guava' and unit_kind <> 'count';

-- Kiwi: ~76 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 76,
    fats_per_100 = fats_per_100 * 76,
    protein_per_100 = protein_per_100 * 76
where name = 'Kiwi' and unit_kind <> 'count';

-- Lemon: ~65 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 65,
    fats_per_100 = fats_per_100 * 65,
    protein_per_100 = protein_per_100 * 65
where name = 'Lemon' and unit_kind <> 'count';

-- Lime: ~67 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 67,
    fats_per_100 = fats_per_100 * 67,
    protein_per_100 = protein_per_100 * 67
where name = 'Lime' and unit_kind <> 'count';

-- Mango: ~200 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 200,
    fats_per_100 = fats_per_100 * 200,
    protein_per_100 = protein_per_100 * 200
where name = 'Mango' and unit_kind <> 'count';

-- Orange: ~131 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 131,
    fats_per_100 = fats_per_100 * 131,
    protein_per_100 = protein_per_100 * 131
where name = 'Orange' and unit_kind <> 'count';

-- Papaya: ~500 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 500,
    fats_per_100 = fats_per_100 * 500,
    protein_per_100 = protein_per_100 * 500
where name = 'Papaya' and unit_kind <> 'count';

-- Passion fruit: ~18 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 18,
    fats_per_100 = fats_per_100 * 18,
    protein_per_100 = protein_per_100 * 18
where name = 'Passion fruit' and unit_kind <> 'count';

-- Peach: ~150 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 150,
    fats_per_100 = fats_per_100 * 150,
    protein_per_100 = protein_per_100 * 150
where name = 'Peach' and unit_kind <> 'count';

-- Pear: ~178 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 178,
    fats_per_100 = fats_per_100 * 178,
    protein_per_100 = protein_per_100 * 178
where name = 'Pear' and unit_kind <> 'count';

-- Pineapple: ~900 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 900,
    fats_per_100 = fats_per_100 * 900,
    protein_per_100 = protein_per_100 * 900
where name = 'Pineapple' and unit_kind <> 'count';

-- Plum: ~66 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 66,
    fats_per_100 = fats_per_100 * 66,
    protein_per_100 = protein_per_100 * 66
where name = 'Plum' and unit_kind <> 'count';

-- Pomegranate: ~282 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 282,
    fats_per_100 = fats_per_100 * 282,
    protein_per_100 = protein_per_100 * 282
where name = 'Pomegranate' and unit_kind <> 'count';

-- Starfruit: ~91 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 91,
    fats_per_100 = fats_per_100 * 91,
    protein_per_100 = protein_per_100 * 91
where name = 'Starfruit' and unit_kind <> 'count';

-- Tangerine: ~88 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 88,
    fats_per_100 = fats_per_100 * 88,
    protein_per_100 = protein_per_100 * 88
where name = 'Tangerine' and unit_kind <> 'count';

-- Watermelon: ~5000 g per piece
update foods
set unit_kind = 'count',
    carbs_per_100 = carbs_per_100 * 5000,
    fats_per_100 = fats_per_100 * 5000,
    protein_per_100 = protein_per_100 * 5000
where name = 'Watermelon' and unit_kind <> 'count';

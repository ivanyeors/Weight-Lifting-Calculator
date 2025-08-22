-- Seed common muscles if not already present

with canonical(name, category) as (
  values
    ('Biceps', 'Arms'),
    ('Triceps', 'Arms'),
    ('Deltoids', 'Shoulders'),
    ('Trapezius', 'Back'),
    ('Upper Back', 'Back'),
    ('Lower Back', 'Back'),
    ('Rectus Abdominis', 'Core'),
    ('Obliques', 'Core'),
    ('Gluteus Maximus', 'Glutes'),
    ('Quadriceps', 'Legs'),
    ('Hamstrings', 'Legs'),
    ('Calves', 'Legs'),
    ('Forearms', 'Arms'),
    ('Latissimus Dorsi', 'Back'),
    ('Rhomboids', 'Back'),
    ('Chest', 'Chest')
)
insert into muscles(name, category)
select c.name, c.category
from canonical c
left join muscles m on m.name = c.name
where m.id is null;



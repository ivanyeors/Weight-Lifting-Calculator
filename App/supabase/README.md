# Weight Lifting Calculator

This app uses Supabase Postgres as the runtime source of truth for the exercise catalog and related reference data. Local JSON files remain for seeding/versioning and as an offline fallback.

## Database workflow (Supabase)

- Folders
  - `supabase/migrations/`: SQL migrations for schema, indexes, RLS
  - `supabase/seed/`: JSON seeds (`exercises_*.json`)
  - `supabase/scripts/`: scripts (e.g., `seed.ts`) to load seeds into the DB

- Environment variables
  - `NEXT_PUBLIC_SUPABASE_URL` (required)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required for app; seed fallback)
  - `SUPABASE_SERVICE_ROLE_KEY` (preferred for seeding; do not commit)
  - Optional server-only: `YOUTUBE_API_KEY`

- Initial setup
  1) Apply migrations in Supabase Dashboard → SQL editor using files in `supabase/migrations/` (start with `0001_*`).
  2) Verify tables exist: `exercises`, `muscles`, `workout_types`, `exercise_muscles`, `exercise_workout_types`.
  3) Set env vars in `.env.local`.
  4) Seed data:
     - `npm install`
     - `npm run db:seed`

- Updating schema
  - Create a new migration in `supabase/migrations/` (do not edit old ones), e.g. `0002_add_equipment.sql`.
  - Run it in Supabase SQL editor (or Supabase CLI).

- Updating exercise data
  - Edit JSON in `supabase/seed/`:
    - `exercises_meta.json` (id, name, description)
    - `exercises_training_data.json` (baseWeightFactor, muscleInvolvement)
    - `exercises_workout_types.json` (workoutTypes)
  - Run `npm run db:seed` (upserts by `id`).
  - Deletions/renames: handle directly in Supabase and keep seeds in sync (seed script does not delete).

- Guardrails
  - Do not commit `SUPABASE_SERVICE_ROLE_KEY`.
  - Do not edit `public/*.json` to change DB content; they are only for offline fallback at runtime.
  - If deploying as a static site (e.g., GitHub Pages), Next.js API routes do not run. Host API routes/server functions (e.g., YouTube search) on a serverful platform or move them to a serverless runtime (e.g., Supabase Edge Functions) and keep keys server-side.

## App data loading
- The app now prefers Supabase for exercises and falls back to the manifest JSONs if DB is empty/unavailable. See `src/lib/exerciseLoader.ts`.


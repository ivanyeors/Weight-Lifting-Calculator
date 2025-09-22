### Tier features

- Free Tier:
  - Ideal weight lifting Calculator
     - Muscle involvement breakdowns
  - Limited Fitness Goal
  - Limited Exercise Library
     - Gym Exercises
     - Custom local exercises
  - Ingredient Database Access
  - Nutrition Plans: 
     - Browse recipes 
     - local macros/micros
     - local inventory 
  - Limited Workout spaces
  - Limited Managed users
  - Limited Workout templates
  - Local Calendar for Fitness Goal

- Personal Tier:
  - Ideal weight lifting Calculator
     - Muscle involvement breakdowns
  - Fitness Goal
     - Unlimited goals
  - Exercise Library Pro
     - Gym Exercises
     - Yoga Stretches
     - (Future incoming exercises)
     - Create Custom exercises (synced)
     - Exercise videos examples (YouTube search)
  - Ingredient Database Access
     - Updates on macro-nutrients and micro-nutrients
     - Add custom ingredients (synced)
     - support updates on adding ingredients
  - Nutrition Plans:
     - support updates on recipes 
     - support updates on macros/micros
     - cloud inventory sync (create/update foods, deduct inventory)
  - Unlimited Workout spaces 
  - Unlimited Managed users
  - Synced Calendar for Fitness Goal
     - Connect up to 2 Google accounts
  - Theme customization: Light & Dark (system)

- Trainer Tier:
  - Ideal weight lifting Calculator
     - Muscle involvement breakdowns
     - Exercise Trend (Based on completed workouts in Fitness Goal)
  - Fitness Goal
     - Unlimited goals
  - Exercise Library Pro
     - Gym Exercises
     - Yoga Stretches
     - Upload and Sync Exercise Videos 
     - (Future incoming exercises)
     - Create Custom exercises (synced)
     - Exercise videos examples (YouTube search)
  - Ingredient Database Access
     - Updates on macro-nutrients and micro-nutrients
     - Add custom ingredients (synced)
     - support updates on adding ingredients
  - Nutrition Plans:
     - support updates on recipes 
     - support updates on macros/micros
     - cloud inventory sync (create/update foods, deduct inventory)
  - Unlimited Workout spaces 
  - Unlimited Managed users
  - Synced Calendar for Fitness Goal
     - Connect unlimited Google accounts
  - Team Management Features
  - Theme customization: Light & Dark (system)


Notes:
- Theme gating via `useUserTier` and `lib/plans` (Free: dark only; Personal/Trainer: toggle light/dark/system).
- Custom exercises: Free saves to `localStorage`; Personal/Trainer sync to Supabase in `custom_exercises`.
- Managed users limit enforced in `src/app/plans/users/page.tsx` (Free ≤ 2); Workout spaces limit in `src/app/workout-spaces/page.tsx` (Free ≤ 2).
- Exercise videos (YouTube search) enabled only for paid tiers in Exercise Library drawer (`src/app/exercise-library/page.tsx`).
- Nutrition calendar add is gated to paid tiers in `src/app/plans/nutrition/RecipeCards.tsx` (shows upgrade dialog for Free). Free can browse and compute locally but not add to calendar.
- Google Calendar integration implemented via `hooks/useGoogleCalendar` and `api/google-calendar/*`. Personal: suggest 1 connected account; Trainer: suggest up to 10. Enforcement to be added in UI/service (currently not hard-limited in code).
- API endpoints: YouTube search `src/app/api/youtube/…` (paid), Google Calendar `src/app/api/google-calendar/*` (paid). Free tier avoids these.
 - Team switching (Trainer): `TeamSwitcher` is at `src/components/ui/team-switcher`. Usage placeholder exists in `src/app/app-sidebar.tsx` header section; unhide the `TeamSwitcher` block (currently wrapped in a `div.mt-2.hidden`) and gate visibility to the Trainer tier.

### Development plan and admin steps

- Supabase JWT claim for plan:
  - Add `plan` claim to the JWT so RLS can read it.
  - If using GoTrue user metadata, set `user_metadata.plan` on users ("Free" | "Personal" | "Trainer").
  - Option A (recommended): set `plan` at top-level JWT via a custom JWT enhancer or Edge Function; fallback reads `user_metadata.plan`.
- Database migrations added:
  - `0019_tier_rls_limits.sql` enforcing Free-tier limits (≤2 `managed_users`, ≤2 `workout_spaces`, ≤9 `workout_templates` allowed; 10th requires upgrade).
- App updates included:
  - `app-sidebar.tsx`: TeamSwitcher shown only for `Trainer`.
  - `exercise-library/page.tsx`: Free can add custom exercises locally; paid syncs to cloud; YouTube search gated to paid.
  - `plans/users/page.tsx`: Free limited to 2 users (UI and RLS); paid unlimited.
  - `workout-spaces/page.tsx`: Free limited to 2 spaces (UI and RLS); paid unlimited.
  - `plans/workout-templates/page.tsx`: Free limited to 9 templates (UI already checks; RLS added).

What you need to do
- Run the new migration in Supabase:
  - Method 1 (preferred): Supabase Dashboard SQL Editor → run contents of `App/supabase/migrations/0019_tier_rls_limits.sql`.
- Ensure JWT exposes the plan claim:
  - If you already store plan in `user_metadata.plan`, nothing else required; our SQL falls back to it.
  - If you prefer a top-level `plan`, configure your auth hook/Edge Function to inject `plan` into the JWT.
- Seed/update users' plan value for testing:
  - Set `user_metadata.plan` to `"Free" | "Personal" | "Trainer"` for test accounts.
- Rebuild and redeploy the app so UI gating is active.

Notes
- RLS limits only affect INSERTS. Existing rows remain accessible. Upgrading a plan immediately lifts caps.
- If you later add tier gates to other tables, reuse `current_plan()` in policies.

-- Run this in Supabase → SQL Editor once. It creates the user_answers table
-- the server-side /api/answers/save endpoint writes to.

create table if not exists public.user_answers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id text,
  email text,
  zip_code text,
  preferred_language text,
  therapy_for text,
  care_preference text,
  payment_preference text,
  availability text,
  insurance_provider text,
  insurance_plan text,
  budget_range text,
  language_priority text,
  required_languages text[],
  preferred_languages text[],
  cultural_context_needs text[],
  culture_priority text,
  modality_preference_ids text[],
  concerns text[],
  life_aspects_by_category jsonb,
  life_aspect_notes_by_category jsonb,
  life_aspect_skipped_by_category jsonb,
  cnip_conversation_styles text[],
  cnip_preference_profile jsonb,
  style_scenario_responses jsonb,
  user_style_vector jsonb,
  style_fit_summary text,
  raw_payload jsonb
);

-- Optional: simple index for looking up a user's most recent answers.
create index if not exists user_answers_user_id_created_at_idx
  on public.user_answers (user_id, created_at desc);

-- The /api/answers/save endpoint authenticates with the service role key
-- so RLS will not block inserts. Leave RLS disabled (default) or enable it
-- with no policies — service role bypasses RLS either way.

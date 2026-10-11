-- Non-destructive v2 deck metadata. Existing rows remain on legacy deck.
alter table public.papi_story_progress
 add column if not exists deck_version smallint not null default 1,
 add column if not exists attempt_cursor integer not null default -1,
 add column if not exists attempt_count integer not null default 0,
 add column if not exists review_cards jsonb not null default '[]'::jsonb;
alter table public.papi_story_progress
 add constraint papi_story_deck_version_check check(deck_version in (1,2)) not valid;
-- Validate separately after checking existing data.
-- No UPDATE to chapter, cursor, version, XP, energy or gold.

-- Account-owned start point for the learning route; school progress and rewards are unchanged.
alter table public.dm_thematic_enrollment
 add column if not exists start_chapter integer,
 add column if not exists start_changed_at timestamptz;
comment on column public.dm_thematic_enrollment.start_chapter is 'Explicit learning-route start chosen by the authenticated account; never marks earlier chapters complete.';

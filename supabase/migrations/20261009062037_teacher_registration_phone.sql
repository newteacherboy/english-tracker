alter table public.teachers add column if not exists phone text;
comment on column public.teachers.phone is 'Teacher contact phone, normalized as 05XXXXXXXXX by the registration API.';
notify pgrst, 'reload schema';

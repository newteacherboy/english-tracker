-- Administrative configuration inventory, isolated from existing production mail jobs.
create table if not exists public.dm_communication_rules (
 key text primary key check (key ~ '^[a-z][a-z0-9_]{2,70}$'),
 category text not null check (category in ('notice','mail')),
 title text not null,
 enabled boolean not null default true,
 settings jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.dm_communication_rules enable row level security;
revoke all on public.dm_communication_rules from anon, authenticated;
insert into public.dm_communication_rules(key,category,title,enabled,settings) values
('teacher_warning','notice','Öğretmen uyarısı',true,'{"priority":1,"trigger":"pending","safe_screen":true}'::jsonb),
('email_verification','notice','E-posta doğrulama',true,'{"priority":2,"trigger":"games","repeat_minutes":10,"safe_screen":true}'::jsonb),
('learner_intro','notice','Başlangıç ve seviye tespiti',true,'{"priority":3,"trigger":"eligible","safe_screen":true}'::jsonb),
('league_momentum','notice','Lig sıralaması değişikliği',true,'{"priority":4,"trigger":"friends","on_change":true,"safe_screen":true}'::jsonb),
('regular_reminders','notice','Normal hatırlatmalar',true,'{"priority":5,"first_active_minutes":5,"gap_active_minutes":5,"session_max":3,"safe_screen":true}'::jsonb),
('weekly_league_mail','mail','Pazar lig özeti',true,'{"weekday":"sunday","hour":19,"timezone":"Europe/Istanbul"}'::jsonb),
('monday_league_mail','mail','Pazartesi lig hatırlatması',true,'{"weekday":"monday","period":"noon"}'::jsonb),
('three_day_mail','mail','Üç günlük bilgilendirme',true,'{"interval_days":3}'::jsonb),
('daily_reengagement','mail','Günlük hatırlatma grupları',true,'{"daily_max":240,"batch_size":15,"no_consecutive_days":true}'::jsonb)
on conflict (key) do nothing;
comment on table public.dm_communication_rules is 'Central teacher-facing policy metadata. Legacy cron jobs remain unchanged until explicitly integrated.';

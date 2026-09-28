-- Diji-Medu Phase 2 realtime draft schema
-- DRAFT ONLY: DO NOT APPLY TO PRODUCTION YET.
-- Google Sheets remains the durable source of record during shadow migration.

create extension if not exists pgcrypto;

create table if not exists realtime_events (
  event_id text primary key,
  event_type text not null,
  student_id text,
  source text not null default 'sheets-shadow',
  payload_version integer not null default 1,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now()
);

create index if not exists realtime_events_student_time_idx
  on realtime_events (student_id, occurred_at desc);

create table if not exists presence_sessions (
  session_id text primary key,
  student_id text not null,
  status text not null check (status in ('online','idle','offline')),
  last_seen_at timestamptz not null default now(),
  connected_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists presence_sessions_student_idx
  on presence_sessions (student_id);

create table if not exists active_duels (
  duel_id text primary key,
  student_id text,
  opponent_id text,
  status text not null,
  source_version text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists active_duels_student_idx
  on active_duels (student_id, updated_at desc);

create table if not exists notification_delivery (
  notification_key text primary key,
  student_id text not null,
  notification_id text,
  delivered_at timestamptz,
  read_at timestamptz,
  expires_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists notification_delivery_student_idx
  on notification_delivery (student_id, updated_at desc);

create table if not exists chat_delivery (
  message_id text primary key,
  conversation_key text not null,
  sender_id text not null,
  recipient_id text,
  delivered_at timestamptz,
  read_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_delivery_conversation_idx
  on chat_delivery (conversation_key, created_at desc);

create table if not exists sync_queue (
  transaction_id text primary key,
  student_id text not null,
  operation_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending','processing','succeeded','failed','dead_letter')),
  attempts integer not null default 0,
  next_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text
);

create index if not exists sync_queue_pending_idx
  on sync_queue (status, next_attempt_at, created_at);

-- Critical rule:
-- realtime tables are projections/interaction state in Phase 2.
-- They do not replace Google Sheets history.
-- No DELETE policy is defined here for durable learning data.

# Phase 2 — Identity Bridge (audit/design only)

## Verified current authentication

The existing Apps Script gateway authenticates students and teachers before protected operations.

- Student login: `giris`
- Teacher login: `ogretmenGiris`
- Logout: `cikis`
- Student session sheet: `Oturumlar`
- Student session lifetime: `GV.OGRENCI_GUN = 30` days
- Teacher session lifetime: `GV.OGRETMEN_SAAT = 8` hours
- Client receives a random token.
- The Sheets session row stores only a SHA-256 hash of that token plus student/role/expiry metadata.
- `gvTokenCoz_` validates the token against cache or `Oturumlar`.
- `gvYetki_` prevents a student from operating on another student's identity fields.

## Security boundary

Supabase must NOT receive:

- passwords
- raw Apps Script session tokens
- password hashes
- the `service_role` key
- unrestricted student datasets

The existing Apps Script session remains authoritative during the shadow phase.

## Proposed bridge

1. User logs in through the existing Apps Script flow.
2. Existing Apps Script returns the normal session token and student/role.
3. A future server-side bridge validates that token using the existing Apps Script session mechanism.
4. The bridge issues a short-lived Supabase-compatible identity token or server-mediated session.
5. Supabase RLS policies use the resulting authenticated identity to scope rows.
6. The browser never receives a privileged database credential.
7. During shadow mode, failure of the Supabase side never blocks the existing Sheets action.

## Important constraint

Do not use `ogrenci` display name as the permanent database primary key.

The current application identifies users heavily by student name, but a future durable identity mapping should introduce an immutable internal user ID and retain the existing student name as a compatibility/display field.

The mapping should eventually be:

`legacy_student_key -> internal_user_id`

and should be created from the existing `İngilizce` account records only after an explicit migration/backup step.

## Migration stages

### Stage A — current
Sheets + Apps Script authentication is authoritative. No Supabase user migration.

### Stage B — shadow identity
Create only the mapping/identity events needed to prove that the current authenticated student maps consistently. No application reads depend on Supabase.

### Stage C — controlled realtime authorization
Enable RLS policies for narrowly scoped realtime tables after the identity mechanism is tested.

### Stage D — gradual realtime reads
Only approved operational domains (presence, active duel, notification delivery/read, chat delivery/read) may read from the realtime backend.

### Stage E — durable identity migration
Only after reconciliation and rollback testing should immutable internal IDs become the canonical backend identity.

## Explicitly deferred

- Supabase Auth replacement of current login
- bulk user migration
- password migration
- changing `index.html`
- changing Apps Script authentication
- deleting/archiving account rows
- changing Google Sheets ownership/source-of-record

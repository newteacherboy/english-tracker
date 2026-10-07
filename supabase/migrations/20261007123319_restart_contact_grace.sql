-- Restart the grace period for all existing students missing contact details.
-- Applied on 2026-10-07; existing sessions and learning progress are preserved.
UPDATE public.students
SET contact_deadline = now() + interval '15 days', contact_notice_day = NULL
WHERE role = 'student' AND NOT public.student_contacts_complete(phone, email);

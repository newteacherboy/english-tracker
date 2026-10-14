-- DijiMedu active vocabulary lookup performance, 2026-10-15
-- Already applied to live Supabase; retained here for repeatable schema changes.
-- Preserves all vocabulary rows and existing indexes.
CREATE INDEX IF NOT EXISTS idx_word_bank_active_class_unit_english
  ON public.word_bank (class_no,unit_no,english)
  WHERE active = true;

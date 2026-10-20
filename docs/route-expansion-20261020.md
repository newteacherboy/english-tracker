# School and CEFR route expansion

School route: classes 1, 3, 7, 8 now have 48, 154, 154, 186 stops respectively (exactly double). Other classes remain at 128, 178, 165, 132. Existing stop IDs stay unchanged. Mixed stops follow the original stops of each class; four distinct words are selected round-robin across that class's active units. Server and browser use the same selection. Mixed IDs occupy the unused suffixes immediately after each unit's base suffixes. Legacy completion migration applies only to original stops.

Learning route: 46 themes, 206 topics, 412 stops. A1/A2 retain their three additional themes and 36 additional stops. B1/B2 each have 10 themes and 50 stops, including seven focused themes added after the initial expansion. A1/A2 each contain 156 stops; B1/B2 each contain 50. CEFR labels describe the intended content level, not a proficiency certificate. New editable content is in `content/thematic-expansion.txt`.

The display order is A1 → A2 → B1 → B2. Stable IDs, deck numbers, question ordering and review predecessors retain the exact meaning of all original 240 lessons and partially completed runs. `routeNumber` is the visible stop number; `number` remains the deterministic deck seed. New traversal uses route order; ID arithmetic must not be used for next lesson lookup. Already opened runs may resume; new runs require the previous route stop. Starting users directly at their school class or CEFR level is deliberately deferred.

Apply `supabase/route-expansion-20261020.sql` before deploying the thematic-learning and diji-api functions and publishing frontend files. The SQL changes only curriculum limits and school catalog, preserving progress and balances. diji-api production deployment preserves every unrelated live module and replaces only verified-games.mjs.

Validation: route-expansion tests check all 271 added school stops against the canonical server deck; all original question decks match byte-for-byte as objects across v5–v8. Thematic tests validate all 412 lessons, four teaching stages and ten graded questions in v8. Mobile browser tests cover theme list, lesson progression, rewards and next lesson.

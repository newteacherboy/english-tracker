# Papi V2 – iki adımın güvenli entegrasyon sınırı

## 1. Öğrenme yolu bağlantısı
- New ordered CEFR route defined in `ingilizce/papi-v2-route.mjs`: A1 0–9 then 40–49, A2 10–19 then 50–59, B1 20–29 then 60–69, B2 30–39 then 70–79.
- New chapters can open as deep-linked prototype with `papi-v2-preview.html?chapter=40` through `?chapter=79`.
- The preview never calls the live API or awards anything. It is not an authenticated, saved student learning session.
- Existing main learning UI and production route remain unchanged pending a server contract that permits V2 safely.

## 2. Supabase migration and regression tests
- `supabase/papi-v2-chapter-range-preparation.sql` is prepared but **must not be run yet**.
- Existing story-api.ts rejects chapter IDs 40–79 and uses the previous numeric chapter as the unlock prerequisite. It therefore requires an explicit track-aware prerequisite mapping before V2 goes live.
- The existing `dm_story_apply` RPC, reward schedule, progress cursor bounds, replays, teacher preview, and energy logic need staging tests before changing accepted chapters or step types.
- Tests: `node --test tests/papi-v2-route.test.mjs tests/story-api.test.cjs`.
- Do not award XP/energy in the preview. Avoid mutating historical chapters 0–39, and use stable stage keys for new chapters.
- No claim of live Supabase execution or fully integrated learning path is made.

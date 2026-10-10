# Papi V2 integration checklist
Status: prototype on draft branch, not deployed.

## Preserve existing progress
- Existing chapter IDs 0–39 are unchanged.
- New IDs 40–79 require explicit track ordering: A1 0–9 + 40–49, A2 10–19 + 50–59, B1 20–29 + 60–69, B2 30–39 + 70–79.
- Existing student XP, gold, energy, chapter completion and replay idempotency must remain server-authoritative.
- Never add steps to existing completed chapters before verifying how step-index progress is stored.

## Limitations
- Auto-generated dialogue pairs need human pedagogical review; not all pairs form meaningful exchanges.
- Cloze distractors require review for plausibility and grammar.
- Speech requests only provide browser TTS metadata, not prerecorded Papi voice or speech recognition.
- Microphone practice must have a non-microphone alternative and a suitable student privacy policy.

## Required verification
1. Run node scripts/papi-v2-question-helpers.test.mjs
2. Run node scripts/papi-v2-content.test.mjs
3. Run node scripts/papi-v2-activity-engine.test.mjs
4. Review all chapter vocabulary and activity pedagogy.
5. Implement stable activity IDs, browser UI, authoritative Supabase validation and migration with rollback.
6. Test fast taps, retry, replay, poor network, zero energy, teacher preview and small screens.
7. Do not merge into production without review and approval.

Related: issue #33 and draft PR #34.

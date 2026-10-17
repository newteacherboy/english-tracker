# Papi learning arena

Approved design option 2 on 17 October 2026. The lesson overlay uses the illustrated midnight courtyard, Papi on a floating platform, a white speech bubble, gold headings, blue answer tiles and green answer feedback. Teaching, choice/listening/image tasks, matching, ordering, final vocabulary review and completion share this styling. The theme selector and other app sections retain their existing design.

Text, options, focus states, progress and feedback are native HTML. The generated reference is not embedded as a screenshot. Only two optimized WebP assets are loaded, reused throughout all 240 lessons: `learning-assets/papi-arena-courtyard.webp` (1024 × 1536) and transparent `learning-assets/papi-arena-guide.webp` (480 × 571).

Built-in ImageGen prompts used the approved design as reference: extract only the indigo courtyard without text, UI, parrot or platform; extract only the matching green aviator Papi and floating platform onto a transparent background. Original generated images were retained; only export size/format was optimized.

Question compilation, grading, saved progression and rewards are unchanged. Each new question and review card resets the overlay scroll position so the header and question remain visible. Styling is scoped to `#dmStoryLesson`, including explicit high-contrast text colors and reduced-motion support.

Validation: `tests/thematic-learning-ui.cjs` exercises all eleven questions, wrong-then-correct review behavior, image loading, audio language, overlay scroll reset, completion and next lesson at 320 × 740, 390 × 844, 768 × 1024 and 844 × 390. It checks horizontal overflow, counts rewards and asserts no page errors. `tests/thematic-learning.test.cjs` and `tests/portal-integrity.test.cjs` cover all 240 compiled decks and script integrity.

## Live lesson state, letters and economy (17 October 2026)

Version 7 adds one letter-completion task before the final review: 11 questions and one teaching step. It selects an expression with at least six alphabetic characters and blanks exactly three letters (up to twelve letters) or four (thirteen or more). All other letters, spaces and punctuation remain fixed. Letter-bank buttons avoid opening the device keyboard. Versions 5 and 6 retain their original task indexes until upgraded. Existing completions and first-time reward claims remain intact.

The cream HUD above the question panel reads gold, effective energy/capacity and the five-answer feather combo from the authenticated server. New thematic questions cost one energy once per cursor, with free retries of that paid question. Five consecutive server-graded correct questions return one energy up to the account cap. A wrong final-review choice still permits completion but resets the combo and is recorded as a mistake. Legacy story chapters 0–79 keep their original energy and combo cadence.

The shared database implementation has a ninth `combo_correct` parameter separating review completion from correctness; the old eight-argument function delegates to it. Both are SECURITY INVOKER and executable only by service_role. Live rollback fixtures in `tests/thematic-economy-v7-db.sql` verify new/legacy economy, paid retries, stale duplicates, one-time rewards, wrong-review combos and zero-energy blocking.

Accepted progress is cached before any final-review return. A completion event and closing a lesson refresh only the learning map from server state, updating its completed count and current node without rebuilding the rest of the screen. The UI test asserts the completed node, next current node, one map instance, live balances and the letter-bank clear/undo flow at four viewport sizes.

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

## Compact viewport and celebration update

The lesson shell uses the visual viewport height, small HUD chips, compact horizontal teaching rows, a measured three-level density adjustment and at most a small final scale adjustment. Its title/footer duplicates no longer consume vertical space. Wide, short screens place the prompt and task side by side. Controls are not clipped: unusually large accessibility text or content that still cannot fit retains a readable scrolling fallback.

Reference cards open in a separate focus-contained study sheet, with the question shell inert until the sheet closes. This keeps optional content from expanding the active question. The observer reacts to task changes, feedback, image loads, fonts and viewport resize and disconnects on close.

Only a server-confirmed positive comboGain invokes the existing DMRouteQuestions.celebrate feather/Papi animation. The lesson instance is relabelled to five correct answers; other routes keep their own original streak labels. The animation is deduplicated by account/chapter/version and never grants energy itself. A microtask preserves the celebration if the same response switches to the result screen.

The result has a mascot entrance, finite confetti, earned-star animation and XP/gold cards populated strictly from the saved reward. Replay screens show no new reward. Reduced-motion settings remain respected.

Verification for this update: JavaScript and inline-script syntax checks, CSS structural checks, four viewport-fit decision cases, and earned-versus-replay result rendering checks passed. The Playwright scenario now asserts no main-panel vertical overflow, visible action buttons, study-sheet focus handling and the five-answer feather animation, including 320×568 and 390×664 viewports. These updated browser scenarios have NOT been run in this session because the execution/browser environment is unavailable.

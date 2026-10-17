# Papi learning arena

Approved design option 2 on 17 October 2026. The lesson overlay uses the illustrated midnight courtyard, Papi on a floating platform, a white speech bubble, gold headings, blue answer tiles and green answer feedback. Teaching, choice/listening/image tasks, matching, ordering, tenth-question vocabulary review and completion share this styling. The theme selector and other app sections retain their existing design.

Text, options, focus states, progress and feedback are native HTML. The generated reference is not embedded as a screenshot. Only two optimized WebP assets are loaded, reused throughout all 240 lessons: `learning-assets/papi-arena-courtyard.webp` (1024 × 1536) and transparent `learning-assets/papi-arena-guide.webp` (480 × 571).

Built-in ImageGen prompts used the approved design as reference: extract only the indigo courtyard without text, UI, parrot or platform; extract only the matching green aviator Papi and floating platform onto a transparent background. Original generated images were retained; only export size/format was optimized.

Question compilation, grading, saved progression and rewards are unchanged. Each new question and review card resets the overlay scroll position so the header and question remain visible. Styling is scoped to `#dmStoryLesson`, including explicit high-contrast text colors and reduced-motion support.

Validation: `tests/thematic-learning-ui.cjs` exercises all ten questions, wrong-then-correct review behavior, image loading, audio language, overlay scroll reset, completion and next lesson at 320 × 740, 390 × 844, 768 × 1024 and 844 × 390. It checks horizontal overflow, counts rewards and asserts no page errors. `tests/thematic-learning.test.cjs` and `tests/portal-integrity.test.cjs` cover all 240 compiled decks and script integrity.

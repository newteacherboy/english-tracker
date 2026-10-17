# Approved live game boards

Reference: user-supplied “Diji-Medu Oyun Tasarım Panosu(1).png”, October 17, 2026.

Hafıza Sandığı retains 12 real word pairs and matching/scoring handlers, presented as three consecutive rounds of four pairs (eight visible cards in two columns), with separate English and Turkish headers, blue/gold cards, owl/chest art, garden, live HUD, and schoolboy guide. Memory jokers remain permanently visible below the cards, without covering questions.

Eksik Harf retains the three-word batches, real answer buttons, score and progression. Wooden signs, numbered parchment panels, cat/pencil art, and the three existing joker controls use the approved composition. Harf Aç and Papağan now target the live letter controls rather than the removed input-based UI. Completion updates the HUD immediately.

Styles are scoped to the active screens and use a named CSS layer so important legacy theme selectors cannot replace the approved artwork. Entry/result dialogs retain their existing layouts. Service worker version: v168.

## Artwork

Built-in ImageGen produced a six-cell production atlas, followed by transparent-background extraction. Final runtime assets live in `ingilizce/games-assets/approved-*-v1.webp`. Exact reference pixels are not claimed: artwork was recreated from the reference.

Prompt: faithfully recreate the approved reference's garden, graduation owl with treasure chest, cat with pencil, blank parchment/wood panel, blank title sign, and pointing schoolboy as six separate production atlas cells; no text or phone frames. A second pass preserved the art and removed outer white backgrounds with alpha. Runtime SVG icons are native vector controls.

## Validation

`DIJI_CHROMIUM=<chromium path> node tests/approved-game-boards-ui.cjs` checks 360×640, 390×844, 768×1024 viewport fit, eight visible memory cards and all three four-pair rounds, a successful match, letter reveal, pronunciation target and transition to the next batch. It includes the email guide and mocks network calls and authentication. It does not validate live account reward persistence.

`node --test tests/classic-wordbank-rotation-smoke.test.cjs` checks shared 12-question selection and word rotation.

## Session navigation and sound update

`play-navigation.js/css` hides the bottom menu only while a visible game or route session is open, including dynamic games, legacy modes, online matches and route lessons. Existing close handlers are reused with a top-left arrow; rally and loading/result screens delegate to their existing public close handlers. Nested sessions keep the menu hidden until the last session closes.

Missing Letter uses a short correct-letter tone, a lower two-note incorrect tone and a distinct four-note completed-word sound. The shared OC wrapper skips its duplicate effect for this game.

`tests/play-navigation-ui.cjs` verifies 13 session surfaces, native exit callbacks and nested-session menu restoration. The approved-board browser test captures real Web Audio note scheduling to distinguish the three Missing Letter sounds.

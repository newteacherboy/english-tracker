# Approved live game boards

Reference: user-supplied “Diji-Medu Oyun Tasarım Panosu(1).png”, October 17, 2026.

Hafıza Sandığı retains 12 real word pairs and matching/scoring handlers, with separate English and Turkish headers, blue/gold cards, owl/chest art, garden, live HUD, and schoolboy guide. Existing memory jokers remain available in an expandable drawer.

Eksik Harf retains the three-word batches, real answer buttons, score and progression. Wooden signs, numbered parchment panels, cat/pencil art, and the three existing joker controls use the approved composition. Harf Aç and Papağan now target the live letter controls rather than the removed input-based UI. Completion updates the HUD immediately.

Styles are scoped to the active screens and use a named CSS layer so important legacy theme selectors cannot replace the approved artwork. Entry/result dialogs retain their existing layouts. Service worker version: v167.

## Artwork

Built-in ImageGen produced a six-cell production atlas, followed by transparent-background extraction. Final runtime assets live in `ingilizce/games-assets/approved-*-v1.webp`. Exact reference pixels are not claimed: artwork was recreated from the reference.

Prompt: faithfully recreate the approved reference's garden, graduation owl with treasure chest, cat with pencil, blank parchment/wood panel, blank title sign, and pointing schoolboy as six separate production atlas cells; no text or phone frames. A second pass preserved the art and removed outer white backgrounds with alpha. Runtime SVG icons are native vector controls.

## Validation

`DIJI_CHROMIUM=<chromium path> node tests/approved-game-boards-ui.cjs` checks 360×640, 390×844, 768×1024 viewport fit, all 24 memory cards, a successful match, letter reveal, pronunciation target and transition to the next batch. It isolates the unrelated pre-existing email-guide.js syntax error and mocks network calls and authentication. It does not validate live account reward persistence.

`node --test tests/classic-wordbank-rotation-smoke.test.cjs` checks shared 12-question selection and word rotation.

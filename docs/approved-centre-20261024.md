# Approved passport, games and centre — 24 October 2026

Selected by the owner: Plan 2 (Öğrenme Pasaportu), Games 1 (Macera Rozetleri), Profile 3 (Benim Merkezim). The existing six-destination bottom dock and original wallet symbols are retained.

## Artwork provenance

Seven original AI-generated layers were created using the approved concept images as visual references. WebP conversion preserves the complete image and transparency; no external stock assets were added. Source records do not establish exclusivity.

| WebP layer | Generation output | Contents |
| --- | --- | --- |
| center-icons | exec-2b17e87e-9200-43b8-be2f-d06c3fea87a1.png | 3×3 transparent centre action atlas |
| account-icons | exec-8ce8d08c-2889-41bd-8b3d-473c55690958.png | 3×3 transparent account action atlas |
| game-icons | exec-29222242-7b4a-4a94-a5ac-b66fd0de6a2b.png | Five transparent category badges |
| passport-icons | exec-df4e2938-cf68-453e-898f-bd98bf9230b7.png | 2×2 stamps and reward pouch |
| passport-hero | exec-4336836c-c19d-48be-89d8-f82cb0e41e45.png | Child explorer, open passport, empty stamp frames |
| center-hero | exec-ad3cdd97-7d1f-4cdc-af85-1f9e90b6dc88.png | Sky and robot header |
| game-thumbs | exec-ca14a81c-9966-4db7-b0ef-b3801fc2fa37.png | 2×2 illustrated garden, train, speed and detective thumbnails |

All layers live under `ingilizce/route-assets/approved/`. Hashes and byte sizes are in `media-rights-manifest.json`. Brief: reproduce the selected cheerful educational soft 3D illustration style, isolated reusable artwork, no mock screen text baked into UI, transparent icon atlases with equal cells. User names, level, XP, stamps, labels and actions are live DOM elements.

## Behavior

The passport renders the existing server summary and uses the existing review, route, next-dialogue and claim handlers. Daily plan awards remain 120 XP + 50 gold. Supplementary dialogue/story first-completion rewards remain 2 energy + 50 XP + 20 gold. No database or reward server changes in this release.

Centre primary actions remain existing handlers. Eight account actions are grouped behind Hesap ve Destek; Escape goes back from that pane, and closing a child screen returns to the originating pane. Game categories retain their native IDs, actions and keyboard behavior; four game thumbnails use the new atlas without changing launch handlers. The obsolete promotional banner remains removed.

## Validation

- 41 relevant Node tests passed, including account switch through the grouped pane, progression, account/session races, reward evidence and next-dialogue selection.
- JavaScript syntax and git whitespace checks passed.
- Browser QA used the production styles and runtime modules with deterministic account/API fixtures. All eight primary and eight account dispatch targets were clicked and verified. No real messages or account logout were performed.
- Profile checked at 320×568, 360×740, 390×844, 430×932, 768×1024, 844×390 and 1440×900. Plan and games checked at 320×568, 390×844, 768×1024 and 844×390. No horizontal content overflow in tested panels; short panels scroll vertically.
- Visual inspection of loaded phone artwork completed. Authenticated production walkthrough is outside the fixture checks; publication is separately verified using Pages status and deployed file hashes.

## Owner correction: full-screen profile and natural image proportions

Profile now fills the viewport behind the persistent dock. Its main destinations and the account/support pane use bounded grid rows with no scrolling. Supplemental descriptions disappear on short screens while all action labels remain. Verified on 320×568, 360×640, 390×744, 430×832, 768×1024 and 844×390, including all account buttons within the panel bounds. The native 4×4 game atlas uses square display cells; the approved wide atlas retains its natural 2:1 cells. This fixes vertical compression in Kelime Laboratuvarı and Hafıza Sandığı without cropping the artwork or changing game actions.

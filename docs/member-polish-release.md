# Member experience update · 13 October 2026

Students open on their selected learning route. The route renders immediately while progress refreshes; the full mascot transition was removed. Daily discovery, weekly goal reminder and character unlock popups are retired. Old generic Papi modal notices now use brief inline status messages; energy interruptions have a separate Papi card.

Automatic contextual, teacher, social, placement and weekly invitations share a foreground interaction budget: first opportunity after five active minutes, at least five active minutes between displays, at most three per session. Gameplay and lesson detail screens block automatic interruptions. Contextual invitations close after ten seconds. Weekly progress, achievement and wardrobe invitations use account/week slots and randomized offsets.

A responsive four-counter wallet covers route, games, study, shop and question panels. Time stars show lifetime hours/minutes. Existing recorded time initializes stars; only new active time earns time chests. Foreground input expires after 90 seconds idle. Heartbeats are server limited to wall-clock elapsed time, so parallel devices cannot double count. Every 10 minutes yields one star; every 100 minutes unlocks a claimable chest.

| Earned time chests | Quality | Gold per chest |
| --- | --- | --- |
| 1–5 | Bronze | 20 |
| 6–10 | Silver | 40 |
| 11–15 | Gold | 75 |
| 16–20 | Crystal | 120 |
| 21 onward | Legendary | 200 |

Each distinct solo game run may earn rewards. Duplicate run IDs remain idempotent, no-correct-answer rounds earn none, and school parkur first-clear rules remain intact.

Memory matching exposes both languages with distinct card colors and selected/wrong/matched states. Missing Letter uses three-word batches, clickable distractor letters, undo, automatic progression and a final per-word review. Shared answer effects add green/red edge feedback, original sounds and supported-device haptics. Learning route speech uses the shared synchronous tap handler; its completion card now includes celebrating Papi. Gameplay has a faster original sequence with a visible mute control; Meteor retains its own soundtrack and controls.

The teacher workspace fills the viewport. Progress avatars are constrained to their own cell. Weekly target selection has three styled choices; daily tasks have a title and short reward caption. Notifications have only All and Announcements tabs, retain complete message content and close when a destination changes.

## Pending user choices and limits

The three notice designs and three branded badge/character sharing designs were generated for selection. Sharing/export is intentionally pending that choice. Actual currency sales require an existing payment integration and configured product prices; no payment flow was fabricated. The energy panel uses the three existing gold-priced energy packs.

Validation: 90 repository checks, 17 focused speech/reward/route checks, DOM interaction checks for letter batches and open memory matching, all changed and inline JavaScript parsed, Edge TypeScript parsed. Database tests verified active-time boundaries, duplicate heartbeat, parallel-device cap, chest idempotency and solo replay rewards in a rolled-back transaction. The deployed time endpoint rejects unauthenticated requests. Browser installation failed in this environment, so physical viewport layout, iOS speech and device vibration remain unverified.

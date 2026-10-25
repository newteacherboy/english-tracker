# Arkadaşlar Kulübü — selected concept 2

Implements the approved child-friendly Friends Club feed with plain navy copy, illustrated category badges, congratulation reactions, eligible game invitations and links to the viewer's own learning activity. The six-item navigation and existing account, feature and progression checks remain in use.

Useful events cover route completion, game first completion of the day and later records, completed dialogue/story, level, badge, daily/weekly mission, streak milestones and league promotion. Existing sentence-based feed data is classified for display; this does not issue rewards or change stored activities. Minor reward/purchase/energy duplicates are omitted.

The bell retains the unread count until the notification centre opens, including unseen announcements. Existing announcement contents are preserved. ISO, epoch seconds/milliseconds and legacy Turkish dates format in Europe/Istanbul with day and time; malformed timestamps show “Zaman bilgisi yok” rather than NaN or a fabricated current time. Toasts no longer mark notifications read automatically.

## Contextual notification actions

Pending classic duel invitations show Accept/Reject when a unique recipient/sender/game/recent timestamp match can be established against the real duel list. Ambiguous or expired records link to duel details. The current invitation is checked again before answering; server errors leave retry controls enabled. Success replaces controls with an explicit game link or rejection status. Gifts open the existing gift picker and purchase confirmation; messages open the existing preset-message picker; follows/congratulations open the sender profile. Game invitations use an available match ID or the existing matches screen. No action is sent merely by opening notifications. Account changes invalidate pending callbacks.

## Artwork provenance

Two original AI-generated production layers were generated on 24 October 2026 with OpenAI image generation:
- `exec-fbeee99a-5e91-436a-9dd2-790be3cfabcf.png`: 2048×683 sky header, children at the edges and a parrot; blank centre for real accessible UI copy.
- `exec-79c7b391-1e90-4d8b-9c9f-70148b07d7bd.png`: transparent 1254×1254 badge atlas with nine equal cells: books/cap, game chest, story/bubbles, star medal, medals, mission checklist/trophy, streak calendar, league trophy and compass/path.

Converted to WebP quality 90/method 6, preserving the full image and transparency. No third-party stock. Runtime text and buttons remain HTML. Hashes are recorded in media-rights-manifest.json.

## Validation

23 focused Node tests passed: feed selection, dates, notification action/matching policy, dialogue selection/account isolation, mission claims, route changes and existing school/social behavior. All changed runtime JavaScript and 62 classic inline scripts parse.

Cloud browser QA used actual production rendering, styles and notification/action modules with mocked students/API writes. Checked 320, 390, 768 and 1180 widths, no horizontal overflow, eligible/locked invitations, route/game links, congratulation, correct invitation game, unread retention/explicit read, exact and malformed date display, accepted/rejected duel results, failed reply retry controls and gift/message navigation. No real student messages, gifts, rewards or duel replies were sent during QA. Authenticated production account behavior was not exercised.

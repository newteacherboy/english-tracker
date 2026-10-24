# Mission passports, chest collection and study tools

Owner request: match the approved daily-plan passport styling in the daily/weekly mission and chest panels; distinguish Pomodoro and Reading Studio from games. Student-feed content and notification placement remain pending owner discussion.

The mission dialog uses the existing account-bound server summary, shows one stamp per target and the real progress counters. Its daily reward remains 30 gold + 70 XP and weekly reward 100 gold + 120 XP. These are separate from the daily learning-plan reward (50 gold + 120 XP). The existing economy claim operation is unchanged; the new claim button stays disabled until all three server-backed targets are complete. Claimed state and the original reward announcement are preserved.

Chest cards retain the server status, catalogue thresholds and amounts, show distinct chest colours, and use the existing claim operation. Claimed, ready and locked states have separate labels and colours. Existing passport, chest and header assets are reused; no new raster media is added to the deployed application.

Pomodoro and Reading Studio keep their original DOM buttons and launch handlers but move into a separate Study Tools section. They have timer/book icons and descriptive Start/Open labels, are excluded from the game list, recent game resume and next-game teaser, and do not set the solo-game stage flag. Moving the original elements preserves attached event handlers and access gates.

Validation: 28 relevant Node tests passed (missions, period claim authority, route navigation and game category contracts), including a new passport account-isolation and reward-amount test. Syntax checks and git diff checks passed. Browser QA used actual production modules/styles with deterministic account/API fixtures: daily/weekly switch, review dispatch, disabled incomplete claim, completed daily claim and claimed-state repaint; chest claimed/ready/locked state and a ready chest opening; both tool dispatches and category hide/restore. Mission and chest panels were checked at 320×568, 390×844 and 768×1024 with no horizontal overflow. Short panels can scroll vertically. No real user rewards or messages were issued during QA.

Two student-feed image concepts were prepared for discussion only: Başarı Günlüğü and Arkadaşlar Kulübü. Their sample text does not change the production feed policy. The notification bar is unchanged until the owner specifies its desired placement and behavior.

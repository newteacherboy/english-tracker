# Papi guided introduction

Eight stages: purpose choice, selected route, notebook lessons, games, friends, My World, store, finish. The current Papi PNG poses animate across a full viewport scene at welcome, every transition, and completion. Reduced motion disables flight, orbit and sparkle animations.

The school choice selects the existing game map; independent learning selects the existing space learning map. Both remain accessible. Existing real screen openers and navigation are retained. Initial-account eligibility uses the existing server-backed tour decision; existing accounts can replay from Help. Completion saves `papi:v3`, legacy general-tour completion markers, and `dmLearningPurpose` in existing account-owned `yo` data.

Preview permits programmatic opening of gated top-level tabs and presents feature cards without level dimming. The modal intercepts outside clicks and traps focus: purchases, game starts and social actions cannot be invoked through the guided preview. Real XP, energy, ownership, curriculum and server permissions are not changed. Completion or account switch removes preview and repaints actual level locks. No new database schema or media assets.

Validation: `tests/papi-onboarding-ui.cjs` covers 320/390/768px, both route controls, all six sections, preview click isolation, backward navigation, completion, saved purpose, replay, reduced motion and account changes. `tests/portal-integrity.test.cjs` parses all inline scripts.

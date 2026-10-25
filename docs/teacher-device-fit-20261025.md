# Teacher continuity and compact screens

Code-based teacher sessions now persist in a device account registry that holds session tokens, names, the selected participant and the last teacher destination. It never stores the entry code. Server session expiry, revocation and scope remain authoritative. A startup denial removes the expired remembered session; a network error preserves it. Classroom game storage remains isolated from personal accounts. The virtual classroom allowance is 25.

The shared account picker lists both personal and code-based teacher accounts, validates the chosen session, and performs a full page handoff. Teacher Panel includes Account Switch immediately above Settings. Explicit sign-out removes the remembered teacher and revokes its sessions. New personal login from isolated teacher mode moves to the normal login context first.

Teacher home and dashboard use the visible viewport height. Dashboard tools are paginated at 10 per page on phones and 12 on wider screens. Every tool remains available; extremely short screens retain scrolling for accessibility. Game-result Continue executes native cleanup and returns to Games; Replay remains Replay. Guest names shorter than three characters show `En az 3 harf girin.` in the form and API.

Eksik Harf renders one word per round with larger letters and answer buttons. The complete word deck, answer verification, score and reward handling are retained.

Validation: focused Node/DOM fixtures cover reopening with a fresh tab session, account switching in both directions, logout, network errors, expired credentials, guest validation, all one-word rounds, result/replay routing, and dashboard pagination. Real-device visual fit remains subject to browser text scaling; small-height fallback preserves access.

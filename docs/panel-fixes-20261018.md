# Teacher and member panel fixes

- Teacher child dialogs suspend the workspace layer and return to it when closed. Games, reports, account tools and lesson dialogs share this handling.
- Memory Chest jokers occupy a permanent row beneath the eight visible cards. They do not overlap answers.
- Letter Hunt retains its own back arrow and timer; the generic duplicate controls stay hidden during play.
- Study no longer creates the game practice catalog.
- The Google external SVG has its XML namespace and explicit image bounds.
- Email Guide parses again; its stylesheet loads statically and the reminder image has fixed bounds. Verified-member suppression and the existing reminder cadence are unchanged.
- Friends and Games are accessible main tabs at level one. Later individual actions and games retain dimmed eligibility gates. The authenticated feed read no longer requires the third main-route stop; write actions retain their requirements.
- Student management offers a permanent-delete form. The current owner password is verified on the server for every deletion, with failed-attempt limits, confirmed target/version checks, role restriction and demo protection. It reuses `diji_delete_account` so session invalidation, related-data cleanup and queued Google cleanup remain transactional. No student password hashes are returned.

Validation: browser regression checks for foreground dialogs, compact banners, guide opening, the decoded Google image, level-one tab entry, duplicate Letter Hunt controls, the delete form and list refresh. API tests cover wrong password, no privilege, rate limit, stale target, demo protection and transactional deletion dispatch. Live negative-auth validation confirms an unsigned delete request is rejected. No real student account was deleted as part of verification.

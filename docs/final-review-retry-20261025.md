# Final review must reach the result

A wrong card in the final review used the same awaited combo-reset request as a matching/letter mistake. If that request failed, the fourth answer was kept behind a rejected promise while all four buttons were disabled. School combo-only updates also performed a redundant energy handshake before recording a mistake.

Review cards now clear the displayed combo immediately. The final answer array carries the actual wrong choices to the existing authoritative review grader, which resets the streak as part of the final graded answer. There is no separate combo request gating the result. Other intermediate mistakes retain their authoritative reset and no longer perform an energy charge handshake just to break a combo.

Completed review choices remain in an account/chapter/cursor-scoped draft during in-view retries. A failed answer save renders a clear enabled result/retry button with all cards retained; reconciling a committed response still advances from the server cursor. Closing or switching accounts clears the draft.

Browser regression scenarios cover a wrong first or fourth card while the separate combo service is unavailable, and a real answer connection failure followed by retry, including the server's minimal duplicate response. They assert a result callback, 9/10 correct, one wrong, no duplicate review combo call, no redundant energy handshake and no replaying four already-answered cards. Existing compiler, grading, teaching and cache tests remain in place.

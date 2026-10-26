# Startup performance and verification repairs

The current thematic route supersedes the legacy story route, but every visitor
still downloaded its 189,105-byte lesson bank. The legacy bank now loads only when
the legacy route is used. Concurrent readers share a download, failures remove
the failed script, and an explicit retry can succeed. The current thematic route
retains its existing entrypoints and never requests that bank.

The approved 29 Ekim variant 2 image is encoded as WebP at the original 941×1672
dimensions, quality 90. Its composition is unchanged. It is 325,846 bytes versus
600,945 bytes for the JPEG. The original JPEG remains available. The preload and
CSS use the same WebP URL. Script URLs and the English service-worker version are
updated so existing installations can discover the release normally.

## Local browser profile

See `startup-performance-20261026.json` for the observations. A signed-out local
Chromium run at 390×844 loaded about 464 KB fewer decoded resource bytes. Both
the baseline and optimized run produced no page errors or missing resources.
This does **not** establish a production speed percentage: the local server was
uncompressed, external requests were mocked/blocked, and one run per variant is
insufficient for timing conclusions. Backend latency and signed-in memory usage
were not measured.

## Additional correctness fix

The full quiz-flow browser check exposed a real sentence-game scope bug: selected
questions came from unit 3, but the run scope included every unit in the class.
Both listening and sentence games now retain exactly the selected class/units.
A focused scope regression and the full classroom quiz-flow test pass.

## Verification repairs

- Pin the 13 browser/Lighthouse workflows still using `ubuntu-latest` to the
  supported Ubuntu 24.04 environment. Playwright's registry includes that target;
  the previous jobs failed before launching a browser on Ubuntu 26.04.
- Update stale tests to preserve the existing product decisions: the new-version
  prompt stays until confirmed refresh, the Friends feed has no wallet, and
  closing account-entry first returns to the saved-account list.
- Repair older verification assumptions without changing gameplay: distinguish
  base unit stops from mixed review stops; check the documented chapter export
  after leading comments; check 10 practice questions separately from final
  cards; use the approved passport/station styles and current viewport exits.
  The entry-panel test waits for restored-session navigation before opening a
  game. The eight-game workflow now shares its browser path with every command.
- Add history/hash records for 16 previously unrecorded repository assets.
  Their original creation/licensing evidence remains explicitly unverified;
  recording their presence is not rights clearance. The new WebP record points
  to its existing JPEG source. The media manifest checker now passes.

Local checks: the 48-test member-flow group passes; the focused performance,
startup, notices, cache and audio group passes; wallet tests pass at 320, 390, 768
and 1280 pixels; both selected and approved route-panel browser suites pass at
320×568, 390×844, 768×1024 and 844×390; panel interaction checks pass. These are
automated Chromium checks, not physical iPhone/iPad tests.

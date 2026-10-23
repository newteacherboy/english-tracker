# Diji Medu approved yearly holiday splash system

Mobile assets retain the originally selected artwork and logo. Dynamic styling and data are scoped to the three existing startup overlays. The 2026 October 29 celebration uses the newly approved second design from October 22 through November 2 inclusive, replacing the earlier legacy splash.

The fixed dates use Europe/Istanbul and inclusive windows (usually minus/plus three days; November 10 uses -2/+1; July 15 uses -2/+2). 2027 uses variant 1, 2028 variant 2. Ramadan runs from its official first day to last day, and Bayram selection takes precedence from three days before Bayram through three days after. Kurban also takes precedence over 19 Mayıs when they overlap.

Religious date source: official Diyanet annual tables at https://vakithesaplama.diyanet.gov.tr/. The background GitHub Actions workflow checks new data monthly, commits updates, and never invents missing years. The client reads the checked-in cache during startup and refreshes from raw GitHub at idle, no external call on the first paint.

Three artistic depictions (19 Mayıs x2, November 10 variant 2) are overlaid with a genuine Atatürk archival 1932 photograph, originally at https://commons.wikimedia.org/wiki/File:Ataturk1930s.jpg (public domain in Turkey). The automatic CI generator also composites this actual photograph into the three approved JPGs if external download succeeds.

Never edit the 2026 existing Republic Day design without explicit user permission. No Supabase database or Edge Function changes needed.

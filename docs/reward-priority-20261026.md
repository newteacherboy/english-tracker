# Direct activity reward priority — 26 October 2026

The user requested study first, route stops second, and games ranked from the most to the least rewarding. Compare direct completion rewards at comparable performance and daily/boost conditions. Chest, three-stop, daily-plan, mission and league gifts are separate bonuses; this is not a claim that every failed lesson pays more than a perfect game or that one-off lessons earn more per day than unlimited game play.

## Direct rewards

Study's full-performance base is now **300 XP / 80 gold**, with the existing 100/80/60/30% tiers. Best-tier improvements pay only the difference; historical completions and balances are never repriced. Route formulas stay unchanged, with a base ceiling of **192 XP / 40 gold** (a ten-question thematic route yields a smaller base).

Game maximums, including daily and purchased boosts:

| Game code | Game | XP cap | Gold cap |
|---|---|---:|---:|
| cumle | Cümle Ustası | 140 | 28 |
| rota | Cümle Rotası, online | 136 | 27 |
| dikte | Kulak Dedektifi / Dikte | 132 | 26 |
| tren | Kelime Treni | 124 | 24 |
| kp | Kelime Modu | 116 | 22 |
| ucus | Kelime Uçuşu, online | 112 | 21 |
| ralli | Kelime Rallisi | 108 | 20 |
| bosluk | Eksik Harf | 100 | 18 |
| asmaca | Harf Avı | 92 | 16 |
| kelimebul | Şifre Kırıcı | 84 | 14 |
| harfbahcesi | Harf Bahçesi | 76 | 12 |
| jp | Risk Balonları | 68 | 10 |
| yagmur | Hız Fırtınası | 60 | 9 |
| ky | Kelime Laboratuvarı | 52 | 8 |
| eslestirme | Eş Bul | 44 | 7 |
| hafiza | Hafıza Sandığı | 36 | 6 |

The shared `dm_ranked_game_reward` calculator scales the existing 80-XP/10-gold bases into these bands. A maximal unboosted performance reaches the advertised cap during the first three paid runs. The ordinary daily band pays half of that, and the post-12 band pays one quarter. Existing accuracy adjustments, rally slowdown, reward receipt IDs and daily counters remain in effect. Boosts can improve the applicable amount but never exceed that game's own caps. Online matches use their existing separate daily counter and now use the same capped calculator. Zero-correct matches receive zero reward.

Topic games retain their >=80% accuracy gate, minimum elapsed time, three paid runs per topic/game/day and zero gold: sohbet 28 XP, durum 26, balon 24, dy 22, cark 20, kova 18. Their per-card labels match these amounts. Break games retain zero XP and cap gold at kosu 5, zipla 4, patlat 3, below the core educational games. Classroom-only Meteor/Word Wheel and teacher-code ranking mode retain their existing no-wallet behavior.

Energy capacity, costs, recharge, lesson energy gifts, route combo energy and all bonus systems are unchanged.

## Validation and rollback

`tests/reward-priority-db.cjs` runs the actual changed SQL on PGlite with isolated schema fixtures. It checks policy/SQL parity, 7,776 cap/boost combinations, lesson tier increments and history, all thirteen solo game payments, daily bands, route first-clear, 12-word rally/slowdown, topic quotas, online cap/polling, break gold and helper RPC privileges. All generated fixture rows roll back. The existing teacher-ranking-only database fixture and focused study, teacher-return, online-auth and service-worker tests also pass. An authenticated production browser session was not exercised.

The deployment changes reward functions only; existing receipts and user balances are untouched. `deployment/reward-priority-rollback.sql` restores the previous formulas and ceiling without deleting any awards made under this policy. If rolling back, also revert the matching client labels and JSON policy in Git.

The preceding Rally compatibility migration filename is aligned with its recorded production version (`20261025210928`), and this policy uses its recorded production version (`20261025224838`), so fresh installs execute the reward policy after the twelve-word compatibility functions.

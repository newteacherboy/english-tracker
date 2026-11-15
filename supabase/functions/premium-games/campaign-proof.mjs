// Same deterministic engine as the client. Build script/test checks byte parity.
import "./candy-core.js";
export function replayCandy(run, actions) {
  if (!Array.isArray(actions) || actions.length < 1 || actions.length > 1000)
    throw Error("Oyun hamleleri doğrulanamadı.");
  const core = globalThis.dmPwmCore,
    st = core.create(core.levelConfig(run.level_no), run.campaign_seed);
  for (const pair of actions) {
    if (
      st.moves <= 0 ||
      core.goalsDone(st) ||
      !Array.isArray(pair) ||
      pair.length !== 4 ||
      pair.some((v) => !Number.isInteger(v) || v < 0 || v >= 5)
    )
      throw Error("Oyun hamleleri doğrulanamadı.");
    const r = core.trySwap(st, pair.slice(0, 2), pair.slice(2));
    if (!r.ok) throw Error("Oyun hamleleri doğrulanamadı.");
  }
  const won = core.goalsDone(st);
  if (!won && st.moves > 0) throw Error("Oyun henüz tamamlanmadı.");
  if (won) core.bonus(st);
  return { score: st.score, won, moves: st.movesUsed };
}

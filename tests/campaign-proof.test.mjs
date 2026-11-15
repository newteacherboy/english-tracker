import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { replayCandy } from "../supabase/functions/premium-games/campaign-proof.mjs";
const core = globalThis.dmPwmCore;
test("Candy server and client use the identical engine", () =>
  assert.equal(
    fs.readFileSync("ingilizce/premium-word-match-core.js", "utf8"),
    fs.readFileSync("supabase/functions/premium-games/candy-core.js", "utf8"),
  ));
test("Candy result is computed from a complete deterministic move log", () => {
  for (const level of [1, 6, 21, 60, 100])
    for (const seed of [1, 23, 2026]) {
      const st = core.create(core.levelConfig(level), seed),
        actions = [];
      while (st.moves > 0 && !core.goalsDone(st)) {
        const pair = core.findMove(st);
        assert.ok(pair);
        actions.push(pair.flat());
        assert.ok(core.trySwap(st, ...pair).ok);
      }
      const won = core.goalsDone(st);
      if (won) core.bonus(st);
      assert.deepEqual(
        replayCandy({ level_no: level, campaign_seed: seed }, actions),
        { score: st.score, won, moves: st.movesUsed },
      );
      assert.throws(() =>
        replayCandy({ level_no: level, campaign_seed: seed }, [
          ...actions,
          [0, 0, 0, 1],
        ]),
      );
    }
});
test("empty, incomplete, out-of-board and oversized proofs are rejected", () => {
  const run = { level_no: 1, campaign_seed: 1 };
  for (const actions of [
    [],
    [[9, 1, 1, 1]],
    [[0, 0, 0, 0]],
    Array(1001).fill([0, 0, 0, 1]),
  ])
    assert.throws(() => replayCandy(run, actions));
});

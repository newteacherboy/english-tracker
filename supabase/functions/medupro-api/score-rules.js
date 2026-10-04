(function (root) {
  'use strict';
  const VERSION = 3;
  function calculate({base = 0, correct = 0, wrong = 0, seconds = 0} = {}) {
    correct = Math.max(0, Math.trunc(Number(correct) || 0));
    wrong = Math.max(0, Math.trunc(Number(wrong) || 0));
    seconds = Math.max(0, Number(seconds) || 0);
    base = Math.max(0, Number(base) || 0);
    const speed = correct ? Math.round(correct * 600 / (1 + seconds / correct)) : 0;
    const penalty = wrong * 40;
    return {puan: Math.max(0, Math.round(base + speed - penalty)), temelPuan: base,
      hizBonusu: speed, hataCezasi: penalty, dogru: correct, yanlis: wrong,
      sure: seconds, xp: Math.max(0, correct * 6 + Math.floor(speed / 100) - wrong * 3),
      yildiz: correct > 0 && correct / (correct + wrong) >= .8 ? 3 : correct > 0 && correct / (correct + wrong) >= .5 ? 2 : 1,
      puanSurum: VERSION};
  }
  const rules = Object.freeze({VERSION, calculate});
  root.DijiScoreRules = rules;
  if (typeof module !== 'undefined' && module.exports) module.exports = rules;
})(globalThis);

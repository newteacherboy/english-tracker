/* Practice only: no XP, currency, energy, league or CEFR claims. */
export const INTERVALS = [1, 3, 7, 14, 30];
export const due = (word, now = Date.now()) => !word.dueAt || !Number.isFinite(Date.parse(word.dueAt)) || Date.parse(word.dueAt) <= now;
export function nextReview(word, correct, now = Date.now()) {
  const streak = correct ? Math.min(5, Math.max(0, Number(word.streak) || 0) + 1) : 0;
  return {...word, streak, attempts: (Number(word.attempts) || 0) + 1,
    correctCount: (Number(word.correctCount) || 0) + Number(correct),
    lastCorrect: correct, lastReviewedAt: new Date(now).toISOString(),
    dueAt: new Date(now + (correct ? INTERVALS[streak - 1] : 1) * 86400000).toISOString()};
}
export function reviewStats(rows, now = Date.now()) {
  const words = rows.map(r => typeof r.value === 'string' ? JSON.parse(r.value) : (r.value || r));
  return {total: words.length, due: words.filter(w => due(w, now)).length,
    strengthening: words.filter(w => w.streak >= 2).length,
    reviewed: words.filter(w => w.attempts > 0).length,
    attempts: words.reduce((s,w) => s + (Number(w.attempts) || 0), 0),
    correct: words.reduce((s,w) => s + (Number(w.correctCount) || 0), 0)};
}

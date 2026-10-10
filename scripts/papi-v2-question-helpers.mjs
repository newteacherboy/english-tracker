/* DijiMedu Papi V2 question helpers. No app side effects; use in future integration. */
export function seededShuffle(items, seed = 1) {
  if (!Array.isArray(items)) throw new TypeError("items must be an array");
  const out = [...items];
  let s = (Number(seed) >>> 0) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    const j = (s >>> 0) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
/* Shuffle answer and distractors together; don't leak an answer at a fixed index. */
export function shuffledChoice(step, seed = 1) {
  if (!step || !Array.isArray(step.options) || !Number.isInteger(step.answer)
      || step.answer < 0 || step.answer >= step.options.length) {
    throw new TypeError("Invalid multiple choice step");
  }
  const pairs = step.options.map((option, original) => ({option, original}));
  const shuffled = seededShuffle(pairs, seed);
  return {...step, options:shuffled.map(x=>x.option),
    answer:shuffled.findIndex(x=>x.original === step.answer)};
}
export function isUsefulOrdering(step) {
  if (!step || step.kind !== "order" || !Array.isArray(step.tokens)) return false;
  const tokens=step.tokens.map(s=>String(s).trim()).filter(Boolean);
  return tokens.length >= 3 && new Set(tokens.map(s=>s.toLocaleLowerCase("en"))).size >= 2;
}
export function classifyActivity(step) {
  if (step?.kind === "listen") return "listening";
  if (step?.kind === "order") return isUsefulOrdering(step) ? "sentence-building" : "needs-redesign";
  if (step?.kind === "choice") return "meaning-or-context";
  if (step?.kind === "scene" || step?.kind === "teach") return "teaching";
  return "unknown";
}
export function inspectChapter(chapter) {
  const steps=chapter?.steps;
  if (!Array.isArray(steps)) return ["Missing steps"];
  const problems=[];
  for(let i=0;i<steps.length;i++) {
    const step=steps[i];
    if(step?.kind === "order" && !isUsefulOrdering(step)) problems.push(`Step ${i}: trivial sentence ordering`);
    if(step?.kind === "choice" && (!Array.isArray(step.options)||step.answer<0||step.answer>=step.options.length)) problems.push(`Step ${i}: invalid answer`);
    if(step?.kind === "listen" && !step.en) problems.push(`Step ${i}: missing spoken text`);
  }
  return problems;
}

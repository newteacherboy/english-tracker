/* DijiMedu V2 – pure activity engine. No browser, database, XP or microphone side effects. */
import {seededShuffle, shuffledChoice} from './papi-v2-question-helpers.mjs';

export function normalizeAnswer(value) {
  return String(value ?? '').normalize('NFKC').replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g,' ').trim().replace(/[.!?,;:]+$/g,'').toLocaleLowerCase('en');
}
export function buildDialogue(chapter, seed=1) {
  const cards=chapter?.phrases;
  if (!Array.isArray(cards)||cards.length<2) throw new TypeError('Two phrases required');
  const [prompt,response]=cards;
  if (!prompt.en||!response.en) throw new TypeError('English dialogue required');
  return {
    kind:'dialogue', label:'Papi ile konuş',
    prompt:prompt.en, promptTranslation:prompt.tr,
    instruction:'Papi’nin cümlesini dinle ve uygun yanıtı seç.',
    options:seededShuffle([response.en,prompt.en],seed),
    correctText:response.en, translation:response.tr, spokenText:prompt.en,
    // This is a practice activity, not assessed speech recognition.
    speakingAssessment:false
  };
}
export function buildCloze(chapter,seed=1) {
  const phrase=chapter?.phrases?.[0];
  if (!phrase?.en) throw new TypeError('A phrase is required');
  const parts=phrase.en.trim().split(/\s+/);
  const candidates=parts.map((p,i)=>({p,i})).filter(x=>x.p.replace(/[^A-Za-z]/g,'').length>=3);
  if(candidates.length===0) return null;
  const chosen=candidates[(Number(seed)>>>0)%candidates.length];
  const correct=chosen.p;
  const prompt=parts.map((p,i)=>i===chosen.i?'_____':p).join(' ');
  const fillers=chapter.phrases.slice(1).flatMap(x=>x.en.split(/\s+/))
    .filter(x=>normalizeAnswer(x)!==normalizeAnswer(correct)&&/^[a-zA-Z]{3,}[!?.,]?$/.test(x));
  const opts=[correct];
  for(const f of fillers){if(!opts.some(o=>normalizeAnswer(o)===normalizeAnswer(f)))opts.push(f);if(opts.length===3)break;}
  if(opts.length<2) return null;
  return {kind:'cloze',label:'Eksik sözcüğü bul',prompt,translation:phrase.tr,
    instruction:'Cümlede eksik olan sözcüğü seç.',options:seededShuffle(opts,seed+19),
    correctText:correct,fullSentence:phrase.en,spokenText:phrase.en};
}
export function prepareActivity(step,seed=1) {
  if(['choice','listen'].includes(step?.kind))return shuffledChoice(step,seed);
  if(['dialogue','cloze'].includes(step?.kind)) {
    if(!Array.isArray(step.options)||!step.options.includes(step.correctText))throw new TypeError('Invalid answer text');
    return {...step,options:seededShuffle(step.options,seed)};
  }
  return {...step};
}
export function evaluateActivity(step,response) {
  if (!step||!['choice','listen','dialogue','cloze','order'].includes(step.kind))
    return {graded:false,correct:null,explanation:null};
  let correct=false;
  if(step.kind==='choice'||step.kind==='listen'){
    correct=Number.isInteger(response)&&response===step.answer;
  } else if(step.kind==='order') {
    // Accept either ordered token array or joined string.
    correct=normalizeAnswer(Array.isArray(response)?response.join(' '):response)===normalizeAnswer(step.answer);
  } else {
    // Select by value, never by a stale shuffled index.
    correct=typeof response==='string'&&normalizeAnswer(response)===normalizeAnswer(step.correctText);
  }
  return {graded:true,correct,explanation:correct?null:
    (step.translation||step.tr||step.hint||step.fullSentence||'Papi ile tekrar dene.')};
}
export function getSpeechRequest(step, speed='normal'){
  const text=step?.spokenText||step?.en;
  if(!text||typeof text!=='string') return null;
  // Consumer asks the browser to speak; never claim an audio file or speech recording exists.
  return {text,lang:'en-US',rate:speed==='slow'?0.75:1,requiresUserGesture:true};
}

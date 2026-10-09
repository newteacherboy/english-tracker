/* DijiMedu V2 – pure activity engine. No browser, database, XP or microphone side effects. */
import {seededShuffle, shuffledChoice} from './papi-v2-question-helpers.mjs';

export function normalizeAnswer(value) {
  return String(value ?? '').normalize('NFKC').replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g,' ').trim().replace(/[.!?,;:]+$/g,'').toLocaleLowerCase('en');
}
export function buildDialogue(chapter, seed=1) {
  // Never invent a conversation from two unrelated phrase cards.
  const dialogue=chapter?.curatedDialogue;
  if(!dialogue) return null;
  const {prompt,reply,translation,distractors=[]}=dialogue;
  if(!prompt||!reply||!translation||!Array.isArray(distractors)||distractors.length<2
      ||new Set([reply,...distractors].map(normalizeAnswer)).size!==distractors.length+1)
    throw new TypeError('Curated dialogue requires a prompt, reply and two distinct distractors');
  return {
    kind:'dialogue',label:'Papi ile konuş',prompt,instruction:'Papi’ye uygun yanıtı seç.',
    options:seededShuffle([reply,...distractors],seed),correctText:reply,
    translation,spokenText:prompt,speakingAssessment:false
  };
}
export function buildCloze(chapter,seed=1){
  // Only publish authored gaps with reviewed alternatives.
  const gap=chapter?.curatedCloze;
  if(!gap)return null;
  if(!gap.prompt||!gap.correctText||!gap.translation||!Array.isArray(gap.distractors)||gap.distractors.length<2
      ||new Set([gap.correctText,...gap.distractors].map(normalizeAnswer)).size!==gap.distractors.length+1)
    throw new TypeError('Cloze requires reviewed alternatives');
  return {kind:'cloze',label:'Eksik sözcüğü bul',instruction:'Eksik kelimeyi seç.',
    prompt:gap.prompt,translation:gap.translation,correctText:gap.correctText,
    fullSentence:gap.fullSentence||'',options:seededShuffle([gap.correctText,...gap.distractors],seed),
    spokenText:gap.fullSentence||''};
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

/* DijiMedu final vocabulary review: pure, portable two-attempt engine.
   This module does not award progress, XP, gold or energy. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DMStoryFinalCards=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const normalize=(value)=>String(value??'').normalize('NFKC').toLocaleLowerCase('en-US')
    .replace(/[\u2018\u2019]/g,"'").replace(/[^\p{L}\p{N}\s']/gu,' ')
    .replace(/\s+/g,' ').trim();
  const unique=(cards)=>{const seen=new Set();return (Array.isArray(cards)?cards:[]).filter(card=>{
    if(!card||!String(card.en||'').trim()||!String(card.tr||'').trim())return false;
    const key=normalize(card.en);if(seen.has(key))return false;seen.add(key);return true;
  }).map(card=>({en:String(card.en).trim(),tr:String(card.tr).trim()}));};
  function create(cards,previous){
    const deck=unique(cards);
    const state={index:0,attempts:0,missed:[],done:false};
    if(previous&&typeof previous==='object'){
      state.index=Math.max(0,Math.min(deck.length,Number(previous.index)||0));
      state.attempts=Math.max(0,Math.min(1,Number(previous.attempts)||0));
      state.missed=Array.isArray(previous.missed)?previous.missed.filter(x=>Number.isInteger(x)&&x>=0&&x<deck.length):[];
    }
    state.done=state.index>=deck.length;
    function current(){return state.done?null:deck[state.index];}
    function submit(answer){
      if(state.done)return {status:'finished',state:snapshot()};
      // Empty answers / speech recognition errors must never spend an attempt.
      if(!String(answer??'').trim())return {status:'empty',remaining:2-state.attempts,state:snapshot()};
      const card=current(),correct=normalize(answer)===normalize(card.en);
      if(correct){state.attempts=0;state.index++;state.done=state.index>=deck.length;return {status:'correct',spoken:card.en,done:state.done,state:snapshot()};}
      state.attempts++;
      if(state.attempts<2)return {status:'hint',hint:card.en.length>1?card.en[0]+'…':'Tekrar dinle.',remaining:1,state:snapshot()};
      if(!state.missed.includes(state.index))state.missed.push(state.index);
      state.attempts=0;state.index++;state.done=state.index>=deck.length;
      return {status:'reveal',spoken:card.en,translation:card.tr,done:state.done,state:snapshot()};
    }
    function snapshot(){return {index:state.index,attempts:state.attempts,missed:[...state.missed],done:state.done,total:deck.length};}
    return {current,submit,snapshot,cards:deck};
  }
  return {create,normalize,unique};
});

/* V8 curriculum candidate: additive, not wired to live student progress or rewards. */
(function(root,factory){
 const candidate=factory(typeof module==='object'&&module.exports?require('./learning-core.js'):root.DMLearningCore);
 if(typeof module==='object'&&module.exports)module.exports=candidate;
 root.DMThematicV8Candidate=candidate;
})(globalThis,function(core){
 'use strict';
 function build(chapter,previous){
  if(!chapter||!Array.isArray(chapter.cards)||chapter.cards.length!==3||!Array.isArray(chapter.examples)||chapter.examples.length!==3)throw Error('Eksik ders içeriği');
  const source=core.deck(chapter,previous,7);
  const questions=source.filter(t=>t.kind!=='teach'&&t.label!=='Son kontrol');
  if(questions.length!==10)throw Error('Tam on soru gerekiyor: '+chapter.id+' / '+questions.length);
  const cards=chapter.cards;
  const lessons=[
   {kind:'teach',label:'Dinle ve Öğren 1/4',cards:[cards[0]],objective:chapter.objective},
   {kind:'teach',label:'Dinle ve Öğren 2/4',cards:[cards[1]],objective:chapter.objective},
   {kind:'teach',label:'Dinle ve Öğren 3/4',cards:[cards[2]],objective:chapter.objective},
   {kind:'teach',label:'Dinle ve Öğren 4/4',cards:chapter.examples,objective:'Öğrendiğin ifadeleri günlük cümlelerde keşfet.'}
  ];
  return Object.freeze([...lessons,...questions]);
 }
 return Object.freeze({build});
});

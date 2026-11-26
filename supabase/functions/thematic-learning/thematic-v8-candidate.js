/* V8 curriculum candidate: additive, not wired to live student progress or rewards. */
(function(root,factory){
 const candidate=factory(typeof module==='object'&&module.exports?require('./learning-core.js'):root.DMLearningCore);
 if(typeof module==='object'&&module.exports)module.exports=candidate;
 root.DMThematicV8Candidate=candidate;
})(globalThis,function(core){
 'use strict';
 function build(chapter,previous,visualQuestions=false){
  if(!chapter||!Array.isArray(chapter.cards)||chapter.cards.length!==3||!Array.isArray(chapter.examples)||chapter.examples.length!==3)throw Error('Eksik ders içeriği');
  const source=core.deck(chapter,previous,7);
  const questions=source.filter(t=>t.kind!=='teach'&&t.label!=='Son kontrol');
  if(questions.length!==10)throw Error('Tam on soru gerekiyor: '+chapter.id+' / '+questions.length);
  const cards=chapter.cards;
  if(visualQuestions){
   const all=[...cards,...chapter.examples];
   const distinct=(list,field)=>[...new Map(list.filter(x=>x?.[field]).map(x=>[core.norm(x[field]),x])).values()];
   const pairCandidates=[...all,...(previous?.cards||[]),...(previous?.examples||[])];
   const pairs=distinct(distinct(pairCandidates,'en'),'tr').slice(0,4);
   if(pairs.length>=2)questions[3]={kind:'match',label:'Görselleri eşleştir',prompt:'Görselleri İngilizce karşılıklarıyla eşleştir.',pairs,visualMatch:true,explanation:'Görselleri doğru ifadelerle eşleştirdin.'};
   const fill=questions[4],target=chapter.examples[1];
   if(fill.kind==='choice'){
    const blank=/_{2,}/.test(fill.prompt||'');
    const pool=[...all,...(previous?.cards||[]),...(previous?.examples||[])].map(x=>blank?x.en.trim().split(/\s+/).at(-1).replace(/[.!?]$/,''):x.en);
    const values=[fill.answer,...fill.options,...pool,'apple','book','school','water','friend','home'];
    questions[4]={...fill,options:values.filter((x,i,a)=>x&&a.findIndex(y=>core.norm(y)===core.norm(x))===i).slice(0,4),picture:target,visualFill:true};
   }
  }
  const lessons=[
   {kind:'teach',label:'Dinle ve Öğren 1/4',cards:[cards[0]],objective:chapter.objective},
   {kind:'teach',label:'Dinle ve Öğren 2/4',cards:[cards[1]],objective:chapter.objective},
   {kind:'teach',label:'Dinle ve Öğren 3/4',cards:[cards[2]],objective:chapter.objective},
   {kind:'teach',label:'Dinle ve Öğren 4/4',cards:chapter.examples,objective:'Öğrendiğin ifadeleri günlük cümlelerde keşfet.'}
  ];
  return Object.freeze([...lessons,...questions]);
 }
 return Object.freeze({build,visualQuestions:true});
});

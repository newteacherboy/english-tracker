const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
test('oral selection buttons track class, pupil and unit; pending questions lock selection',async()=>{const d=new JSDOM('<body></body>',{url:'https://test.local',runScripts:'outside-only',pretendToBeVisual:true}),w=d.window;w.eval("var apiURL='https://test.local/diji-api';");w.sessionStorage.setItem('ing_ogr_token','test');w.fetch=async(u,o)=>{const b=JSON.parse(o.body);return {ok:true,json:async()=>b.action==='setup'?{ok:true,pupils:[{id:'a',username:'Ada',class_no:5,branch:'A'},{id:'b',username:'Bora',class_no:6,branch:'B'}]}:b.action==='units'?{ok:true,units:[1,2]}:{ok:true,serverNow:new Date().toISOString(),question:{id:'q',english:'apple',turkish:'elma',status:b.action==='grade'?'correct':'pending',expires_at:new Date(Date.now()+15000).toISOString()}}};};w.eval(fs.readFileSync('ingilizce/teacher-oral.js','utf8'));await w.dmTeacherOral.open();const groups=()=>w.document.querySelectorAll('.dm-oral-choices');assert.equal(groups()[0].querySelectorAll('button').length,2);groups()[0].querySelector('button').click();assert.equal(groups()[0].querySelector('[aria-pressed=true]').textContent,'5. Sınıf / A');groups()[1].querySelector('button').click();await new Promise(r=>setImmediate(r));groups()[2].querySelector('button').click();assert.equal(w.document.querySelector('[data-unit]').value,'1');w.document.querySelector('[data-draw]').click();assert.equal(w.document.querySelector('[data-question-screen]').hidden,false,'question screen must open immediately on click');assert.equal(w.document.querySelector('[data-question-loading]').hidden,false,'word loading is shown inside standalone screen');await new Promise(r=>setImmediate(r));assert.equal(w.document.querySelector('[data-question-screen]').hidden,false);assert.equal(w.document.querySelector('[data-picker-screen]').getAttribute('aria-hidden'),'true');w.document.querySelector('[data-question-back]').click();assert.equal(w.document.querySelector('[data-question-screen]').hidden,true);assert.equal(w.document.querySelector('[data-class]').value,'5|A');assert.equal(w.document.querySelector('[data-student]').value,'a');assert.equal(w.document.querySelector('[data-unit]').value,'1');assert.equal(w.document.querySelector('[data-open-question]').hidden,false);w.document.querySelector('[data-open-question]').click();assert.equal(w.document.querySelector('[data-question-screen]').hidden,false);assert.equal(w.document.querySelector('#dmTeacherOralQuestion').parentElement,w.document.body);assert.equal(w.document.querySelector('#dmTeacherOralQuestion [data-card]').hidden,false);assert([...groups()[0].querySelectorAll('button')].every(b=>b.disabled));w.document.querySelector('[data-grade=yes]').click();await new Promise(r=>setImmediate(r));assert.equal(w.document.querySelector('[data-card]').dataset.result,'correct');assert.match(w.document.querySelector('#dmTeacherOralQuestion [data-status]').textContent,/Doğru cevap/);assert.equal(w.document.querySelector('[data-grade=yes]').disabled,true);w.dmTeacherOral.close();w.close();});

test('oral incorrect grading exits saving state in detached word screen',async()=>{
 const d=new JSDOM('<body></body>',{url:'https://test.local',runScripts:'outside-only',pretendToBeVisual:true}),w=d.window;
 w.eval("var apiURL='https://test.local/diji-api';");
 w.sessionStorage.setItem('ing_ogr_token','test');
 w.fetch=async(u,o)=>{
  const b=JSON.parse(o.body),now=new Date().toISOString();
  const value=b.action==='setup'?{ok:true,pupils:[{id:'a',username:'Ada',class_no:5,branch:'A'}]}:
   b.action==='units'?{ok:true,units:[1]}:{ok:true,xp:b.action==='grade'?-20:0,serverNow:now,question:{id:'q',english:'orange',turkish:'portakal',status:b.action==='grade'?'wrong':'pending',expires_at:new Date(Date.now()+15000).toISOString()}};
  return {ok:true,json:async()=>value};
 };
 w.eval(fs.readFileSync('ingilizce/teacher-oral.js','utf8'));
 await w.dmTeacherOral.open();
 const click=(index,option=0)=>w.document.querySelectorAll('.dm-oral-choices')[index].querySelectorAll('button')[option].click();
 click(0);click(1);await new Promise(resolve=>setImmediate(resolve));click(2);
 w.document.querySelector('[data-draw]').click();await new Promise(resolve=>setImmediate(resolve));
 w.document.querySelector('#dmTeacherOralQuestion [data-grade=no]').click();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(w.document.querySelector('#dmTeacherOralQuestion [data-card]').dataset.result,'wrong');
 assert.match(w.document.querySelector('#dmTeacherOralQuestion [data-status]').textContent,/20 XP düşüldü/);
 assert.doesNotMatch(w.document.querySelector('#dmTeacherOralQuestion [data-status]').textContent,/kaydediliyor/);
 assert.equal(w.document.querySelector('[data-class]').value,'5|A');
 assert.equal(w.document.querySelector('[data-student]').value,'a');
 assert.equal(w.document.querySelector('[data-unit]').value,'1');
 w.dmTeacherOral.close();w.close();
});

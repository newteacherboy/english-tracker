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

test('grade request is submitted even when selection control rendering throws',async()=>{
 const d=new JSDOM('<body></body>',{url:'https://test.local',runScripts:'outside-only',pretendToBeVisual:true}),w=d.window;
 w.eval("var apiURL='https://test.local/diji-api';");
 w.sessionStorage.setItem('ing_ogr_token','test');
 const calls=[];
 w.fetch=async(u,o)=>{
  const b=JSON.parse(o.body);calls.push(b.action);
  const response=b.action==='setup'?{ok:true,pupils:[{id:'a',username:'Ada',class_no:5,branch:'A'}]}:
   b.action==='units'?{ok:true,units:[1]}:{ok:true,xp:20,serverNow:new Date().toISOString(),question:{
    id:'q',english:'apple',turkish:'elma',status:b.action==='grade'?'correct':'pending',
    expires_at:new Date(Date.now()+15000).toISOString()
   }};
  return {ok:true,json:async()=>response};
 };
 w.eval(fs.readFileSync('ingilizce/teacher-oral.js','utf8'));
 await w.dmTeacherOral.open();
 const click=i=>w.document.querySelectorAll('.dm-oral-choices')[i].querySelector('button').click();
 click(0);click(1);await new Promise(resolve=>setImmediate(resolve));click(2);
 w.document.querySelector('[data-draw]').click();await new Promise(resolve=>setImmediate(resolve));
 const picker=w.document.querySelector('#dmTeacherOral');
 const original=picker.querySelectorAll.bind(picker);
 picker.querySelectorAll=(selector)=>{if(selector==='.dm-oral-fields select')throw new Error('layout temporarily failed');return original(selector);};
 w.document.querySelector('#dmTeacherOralQuestion [data-grade=yes]').click();
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(calls.includes('grade'),'grade request must reach server even if controls crash');
 assert.match(w.document.querySelector('#dmTeacherOralQuestion [data-status]').textContent,/20 XP kaydedildi/);
 assert.equal(w.document.querySelector('#dmTeacherOralQuestion [data-card]').dataset.result,'correct');
 w.dmTeacherOral.close();w.close();
});

test('multiple units toggle independently, skip exhausted units and preserve failed request for retry',async()=>{
 const d=new JSDOM('<body></body>',{url:'https://test.local',runScripts:'outside-only',pretendToBeVisual:true}),w=d.window;
 try{
 w.eval("var apiURL='https://test.local/diji-api';Math.random=()=>.999;");w.sessionStorage.setItem('ing_ogr_token','test');
 const draws=[];let fail=false,exhausted=false;
 w.fetch=async(u,o)=>{
  const b=JSON.parse(o.body);let data;
  if(b.action==='setup')data={ok:true,pupils:[{id:'a',username:'Ada',class_no:5,branch:'A'}]};
  if(b.action==='units')data={ok:true,units:[1,2,3]};
  if(b.action==='draw'){
   draws.push(b);if(fail){fail=false;throw Error('Network error');}
   data=exhausted||b.unit===1?{ok:true,exhausted:true,mesaj:'Tüm kelimeler soruldu.'}:{ok:true,question:{id:'q',english:'Maths',turkish:'Matematik',status:'pending',expires_at:new Date(Date.now()+15000).toISOString()}};
  }
  if(b.action==='grade')data={ok:true,xp:20,question:{id:'q',english:'Maths',turkish:'Matematik',status:'correct'}};
  return {ok:true,json:async()=>data};
 };
 w.eval(fs.readFileSync('ingilizce/teacher-oral.js','utf8'));await w.dmTeacherOral.open();
 const el=s=>w.document.querySelector(s),unit=i=>w.document.querySelectorAll('[data-unit] + div button')[i],tick=()=>new Promise(r=>setImmediate(r));
 el('[data-class] + div button').click();el('[data-student] + div button').click();await tick();
 unit(0).click();unit(1).click();
 assert.deepEqual([...el('[data-unit]').selectedOptions].map(o=>o.value),['1','2']);
 unit(1).click();assert.equal(w.document.querySelectorAll('[data-unit] + div [aria-pressed=true]').length,1);unit(1).click();
 el('[data-draw]').click();await tick();assert.deepEqual(draws.map(x=>x.unit),[1,2]);assert.notEqual(draws[0].requestId,draws[1].requestId);
 assert.equal(unit(0).disabled,true);el('[data-question-back]').click();assert.equal(w.document.querySelectorAll('[data-unit] + div [aria-pressed=true]').length,2);
 el('[data-open-question]').click();el('[data-grade=yes]').click();await tick();
 el('[data-question-back]').click();unit(0).click();fail=true;el('[data-draw]').click();await tick();const failed=draws.at(-1);
 el('[data-draw]').click();await tick();assert.equal(draws.at(-1).unit,failed.unit);assert.equal(draws.at(-1).requestId,failed.requestId);
 el('[data-grade=yes]').click();await tick();exhausted=true;el('[data-next-word]').click();await tick();
 assert.equal(el('[data-question-screen]').hidden,true);unit(1).click();assert.equal(el('[data-draw]').disabled,true);
 }finally{w.dmTeacherOral.close();w.close();}
});

test('premium order starts with Kelime Golü and Papizzle and ends with rally for both roles',()=>{
 const fixture=fs.readFileSync('tests/games-hub-ui.cjs','utf8').match(/body:`([\s\S]*?)`\}\);/)[1];
 const dom=new JSDOM(fixture,{url:'https://games.test/',runScripts:'dangerously',pretendToBeVisual:true}),w=dom.window;
 try{
 const grid=w.document.querySelector('.az-grid2x2');
 for(const id of ['rallyActivity','towerActivity','kelimeGoluSolo']){const b=w.document.createElement('button');b.id=id;b.className='az-gcard';b.textContent=id;grid.append(b);}
 w.eval(fs.readFileSync('ingilizce/activity-ui.js','utf8'));
 for(const teacher of [false,true]){
  w.dmTeacherPortalMode=teacher;w.dmGamesUI.enter();
  const ids=[...w.document.querySelectorAll('.gg-shelf-card')].map(c=>c.dataset.ggSource);
  assert.deepEqual(ids.slice(0,2),['kelimeGoluSolo','papizzleActivity']);assert.equal(ids.at(-1),'rallyActivity');
 }
 }finally{w.close();}
});

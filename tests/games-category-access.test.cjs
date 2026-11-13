const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
test('two-level categories, topic replacement, and exhausted-game purchase entry',async()=>{
 const fixture=fs.readFileSync('tests/games-hub-ui.cjs','utf8').match(/body:`([\s\S]*?)`\}\);/)[1];
 const dom=new JSDOM(fixture,{url:'https://games.test/',runScripts:'dangerously',pretendToBeVisual:true});
 const w=dom.window;let remaining=0,opened=0,offers=[];
 w.fetch=async()=>({ok:true,json:async()=>({ok:true,plan:'free',remaining})});
 w.alert=message=>{throw Error(message);};w.premiumKelimeEslestirmeAc=()=>opened++;
 w.DMSatis={planlar:(...args)=>offers.push(args)};w.DijiTopicGamesA1=[];
 w.eval(fs.readFileSync('ingilizce/konu-oyunlari.js','utf8'));
 w.eval(fs.readFileSync('ingilizce/activity-ui.js','utf8'));w.dmGamesUI.enter();
 const d=w.document,click=s=>d.querySelector(s).click(),tick=()=>new Promise(r=>setTimeout(r,10));
 assert.equal(d.querySelectorAll('[data-gg-main]').length,2);
 assert.equal(d.querySelector('.gg-tabs').hidden,true);
 click('[data-gg-main=free]');assert.equal(d.querySelector('.gg-tabs').hidden,false);
 assert.equal([...d.querySelectorAll('.gg-tabs [data-gg-party]')].filter(b=>!b.hidden).length,5);
 for(const category of ['solo','duo','free','break']){
  click('[data-gg-party='+category+']');click('#ggKonuTab');await tick();
  const hub=d.querySelector('.kg-hub'),list=d.querySelector('.gg-overview');
  assert.equal(list.style.display,'none');assert.equal(hub.hidden,false);
  assert(hub.compareDocumentPosition(list)&w.Node.DOCUMENT_POSITION_FOLLOWING);
  click('[data-gg-party=solo]');assert.equal(hub.hidden,true);assert.equal(hub.style.display,'none');
 }
 click('[data-gg-main=premium]');
 click('[data-gg-source=premiumWordMatchActivity]');await tick();
 assert.equal(opened,0);assert.deepEqual(offers,[['premium-oyunlar','pro']]);
 remaining=1;click('[data-gg-source=premiumWordMatchActivity]');await tick();assert.equal(opened,1);
 dom.window.close();
});

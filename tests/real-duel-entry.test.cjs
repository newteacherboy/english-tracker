const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setImmediate(r));
async function fixture(level=24,premium=false){
 const dom=new JSDOM('<body><div id="tab-meduakis"></div></body>',{url:'https://app.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,requests=[],gates=[],toasts=[];let response={ok:true};
 await new Promise(r=>w.addEventListener('load',r,{once:true}));w.aktifOgrenciAdi='Player';w.apiURL='https://api.test/diji-api';w.localStorage.setItem('ing_token','fixture');w.setInterval=()=>0;w.setTimeout=()=>0;
 w.dmProgression={level:()=>level,earlyAccess:()=>premium,require:code=>{gates.push(code);return premium||level>=({duello:20,iki_kisilik:30,takip:15}[code]||1)}};w.yoToast=m=>toasts.push(m);w.dmArenaAc=()=>{throw Error('Classic duel must not route to the level-30 match list')};
 w.fetch=async(url,opt)=>{const b=JSON.parse(opt.body);requests.push(b);return {ok:true,json:async()=>b.islem==='takipDavetListesi'?{ok:true,liste:[{ad:'Efe'}]}:b.islem==='sosyalDurum'?{ok:true,blocked:false}:response};};
 w.eval(fs.readFileSync('ingilizce/medupro.js','utf8'));w.eval(fs.readFileSync('ingilizce/league-ui.js','utf8'));
 return {w,dom,requests,gates,toasts,setResponse:r=>response=r,close:()=>dom.window.close()};
}
test('blue real-friend entry and profile card reach the identical classic game picker at level 24',async()=>{
 const f=await fixture();f.w.dmLeagueUI.openDuelChooser();f.w.document.querySelector('.dm-lig-duel-secondary').click();await tick();assert(f.w.document.querySelector('[data-real-duel="Efe"]'));f.w.document.querySelector('[data-real-duel]').click();await tick();
 const fromBlue=f.w.document.querySelector('.dm-game').innerHTML;f.w.document.querySelector('.dm-x').click();await f.w.dmDuelAc('Efe');assert.equal(f.w.document.querySelector('.dm-game').innerHTML,fromBlue);assert(!f.requests.some(x=>x.islem==='oyunEslesmelerim'));assert(f.gates.every(x=>x==='duello'));f.close();
});
test('classic success is shown only for confirmed sends; server errors leave a retryable button',async()=>{
 const f=await fixture();await f.w.dmDuelAc('Efe');f.setResponse({ok:false,mesaj:'Davet kaydedilemedi'});f.w.document.querySelector('.dm-send-duel').click();await tick();assert(!f.toasts.some(x=>/gönderildi/i.test(x)));assert.match(f.toasts.at(-1),/Davet kaydedilemedi/);assert.equal(f.w.document.querySelector('.dm-send-duel').disabled,false);
 f.setResponse({ok:true});f.w.document.querySelector('.dm-send-duel').click();await tick();assert.match(f.toasts.at(-1),/Düello daveti gönderildi/);assert.match(f.w.document.querySelector('.dm-send-duel').textContent,/Gönderildi/);assert.equal(f.requests.at(-1).islem,'duelloGonder');f.close();
});
test('Kelime Uçuşu and Cümle Rotası keep their separate level-30 gate in the same picker',async()=>{
 const f=await fixture();await f.w.dmDuelAc('Efe','ucus');f.w.document.querySelector('.dm-send-duel').click();await tick();assert.equal(f.gates.at(-1),'iki_kisilik');assert(!f.requests.some(x=>x.islem==='oyunEslesmeOlustur'));assert.equal(f.toasts.length,0);f.close();
});
test('level 19 is blocked consistently and Premium Pro opens both entry routes early',async()=>{
 const f=await fixture(19);await f.w.dmDuelAc('Efe');await f.w.dmRealDuelAc();assert.equal(f.w.document.querySelectorAll('.dm-perde').length,0);assert.equal(f.requests.length,0);f.close();
 const p=await fixture(1,true);await p.w.dmRealDuelAc();assert(p.w.document.querySelector('[data-real-duel]'));p.w.document.querySelector('[data-real-duel]').click();await tick();assert(p.w.document.querySelector('.dm-game'));p.close();
});

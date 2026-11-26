const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('ingilizce/premium-play-offer.js','utf8');
function setup({result={completed:true,claimed:true,energy:7},claimed=true,native=true}={}){
 const dom=new JSDOM('<button id="origin">Başla</button>',{url:'https://app.dijimedu.com/ingilizce/',runScripts:'outside-only'}),w=dom.window,calls=[];
 w.localStorage.setItem('ing_token','verified-student-session-token');
 w.AbortSignal.timeout=()=>undefined;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.dmAndroidPlacements={rewardEnabled:()=>true,rewardAllowed:()=>true};
 if(native)w.dmAndroidAds={show:async kind=>{calls.push({ad:kind});return result;}};
 w.fetch=async(_url,options)=>{const b=JSON.parse(options.body);calls.push(b);return {ok:true,json:async()=>b.op==='ad-prepare'?{ok:true,offerId:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'}:{ok:true,claimed,remaining:claimed?1:0}};};
 w.eval(source);w.document.getElementById('origin').focus();return {w,calls,dom};
}
const tick=()=>new Promise(r=>setTimeout(r,15));
test('verified video redeems selected game and resumes once',async()=>{const {w,calls,dom}=setup();let ready=0;w.dmPremiumPlayOffer.open({game:'papizzle',onReady:()=>ready++});w.document.querySelector('[data-video]').click();await tick();assert.equal(ready,1);assert.deepEqual(calls.map(x=>x.op||x.ad),['ad-prepare','energy','ad-redeem']);assert.ok(calls.filter(x=>x.op).every(x=>x.game==='papizzle'));assert.equal(w.document.querySelector('.dmpo-veil'),null);dom.window.close();});
for(const [label,result] of [['dismissed',{completed:false}],['test',{completed:true,test:true}]])test(label+' video never redeems a real play',async()=>{const {w,calls,dom}=setup({result});let ready=0;w.dmPremiumPlayOffer.open({game:'word-goal',onReady:()=>ready++});w.document.querySelector('[data-video]').click();await tick();assert.equal(ready,0);assert.equal(calls.filter(x=>x.op==='ad-redeem').length,0);assert.ok(w.document.querySelector('.dmpo-status').textContent);dom.window.close();});
test('late proof rechecks without showing a second video',async()=>{const {w,calls,dom}=setup({claimed:false});w.dmPremiumPlayOffer.open({game:'rally'});const b=w.document.querySelector('[data-video]');b.click();await tick();assert.match(b.textContent,/kontrol et/);b.click();await tick();assert.equal(calls.filter(x=>x.ad).length,1);assert.equal(calls.filter(x=>x.op==='ad-redeem').length,2);dom.window.close();});
test('double tap does not start two ads',async()=>{const {w,calls,dom}=setup();w.dmPremiumPlayOffer.open({game:'word-match'});const b=w.document.querySelector('[data-video]');b.click();b.click();await tick();assert.equal(calls.filter(x=>x.ad).length,1);dom.window.close();});
test('missing native bridge disables only the ad option',()=>{const {w,dom}=setup({native:false});w.dmPremiumPlayOffer.open({game:'cloud-flight'});assert.equal(w.document.querySelector('[data-video]').disabled,true);assert.equal(w.document.querySelector('[data-pro]').disabled,false);dom.window.close();});
test('Premium Pro button selects premium_pro and closes game first',()=>{const {w,dom}=setup();const calls=[];w.DMSatis={planlar:(...a)=>calls.push(a)};w.dmPremiumPlayOffer.open({game:'cloud-flight',onPlans:()=>calls.push('closed-game')});w.document.querySelector('[data-pro]').click();assert.equal(calls[0],'closed-game');assert.equal(calls[1][1],'premium_pro');assert.equal(w.document.querySelector('.dmpo-veil'),null);dom.window.close();});
test('account switch during video never redeems for another account',async()=>{const {w,calls,dom}=setup();let resolve;w.dmAndroidAds.show=()=>new Promise(r=>resolve=r);w.dmPremiumPlayOffer.open({game:'word-goal'});w.document.querySelector('[data-video]').click();await tick();w.localStorage.setItem('ing_token','different-account');w.document.dispatchEvent(new w.Event('dm:login'));resolve({completed:true,claimed:true});await tick();assert.equal(calls.filter(x=>x.op==='ad-redeem').length,0);assert.equal(w.document.querySelector('.dmpo-veil'),null);dom.window.close();});
test('every Premium game has a shared offer entry',()=>{for(const [file,game] of [['premium-word-match','word-match'],['papizzle','papizzle'],['premium-cloud-flight','cloud-flight'],['kelime-rallisi','rally']]){const s=fs.readFileSync('ingilizce/'+file+'.js','utf8');assert.match(s,/dmPremiumPlayOffer/);assert.ok(s.includes("game: '"+game+"'")||s.includes("game:'"+game+"'"));}assert.match(fs.readFileSync('ingilizce/premium-skill-games.js','utf8'),/dmPremiumPlayOffer.*game:s.key/);});

const fs=require('node:fs');
const read=p=>fs.readFileSync('ingilizce/'+p,'utf8');
const data=read('app-js/i03-veriler.js'),index=read('index.html');
const core=data.slice(data.indexOf('/* ========== 9) SOHBET'),data.indexOf('/* ========== 10-11)'));
const level=data.slice(data.indexOf('const YO_SOHBET_SEVIYE'),data.indexOf('const YO_SOHBET ='));
const route=index.slice(index.indexOf('/* ---- Papağanla sohbet ekranı ---- */'),index.indexOf('/* ---- Alt menüde aktif sekme'));
const bootstrap=`var aktifOgrenciAdi='Fixture',apiURL='https://api.test/functions/v1/diji-api',yo={sohbet:{},altin:0,totalXp:0},qaPremium=true,qaTrialRemaining=2,qaCalls=[],qaSounds=[],qaPlan=null,qaWalletWrites=0,qaEnergyCalls=0;
localStorage.setItem('ing_token','fixture-token');window.matchMedia=()=>({matches:true});Element.prototype.scrollIntoView=function(){};
window.yoHazirMi=()=>true;window.yoGuvenliMetin=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));window.yoSoyle=()=>{};window.yoSes=s=>qaSounds.push(s);window.yoToast=s=>window.qaToast=s;window.yoKaydet=()=>{};
window.yoEnerjiKontrol=()=>{qaEnergyCalls++;throw Error('dialogues must never spend energy')};window.yoXpEkle=()=>{throw Error('must use server reward')};
window.dcTumTamEkranlariKapat=()=>document.querySelectorAll('.dc-fullscreen-overlay').forEach(e=>e.classList.remove('active'));window.dcBottomNavSenkronize=()=>{};window.sonEkranaDon=()=>{};
window.dmApplyRewardState=(v)=>{qaWalletWrites++;Object.assign(yo,v)};window.DMSatis={planlar:(source,plan)=>qaPlan=[source,plan]};
let qaRun=null,qaProgress={};window.fetch=async(_url,options)=>{const b=JSON.parse(options.body);qaCalls.push(b);let d;if(!qaPremium&&qaTrialRemaining===0&&['dialogue_status','dialogue_start'].includes(b.action)&&(b.action==='dialogue_status'||qaRun?.id!==b.runId))d={ok:false,code:'premium',mesaj:'Premium Pro gerekli.'};
else if(b.action==='dialogue_status')d={ok:true,premium:qaPremium,trialRemaining:qaTrialRemaining,progress:qaProgress};
else if(b.action==='dialogue_start'){if(!qaPremium&&(b.action==='dialogue_status'||qaRun?.id!==b.runId))qaTrialRemaining--;const scene=DMPapiDialogueCatalog.find(x=>x.id===b.dialogueId);qaRun={id:b.runId,scene,step:0,correct:0,wrong:0,first:0,attempts:0,last:null};d={ok:true,premium:qaPremium,trialRemaining:qaTrialRemaining,step:0,correctCount:0,wrongCount:0,firstCount:0,attempts:0,progress:qaProgress};}
else if(b.action==='dialogue_answer'){if(qaRun.last?.requestId===b.requestId)return {json:async()=>qaRun.last.result};const q=qaRun.scene.satirlar[qaRun.step];const good=b.text===q.ornek;qaRun.attempts++;const advance=good||qaRun.attempts>=2;if(good){qaRun.correct++;if(qaRun.attempts===1)qaRun.first++;}else if(advance)qaRun.wrong++;if(advance){qaRun.step++;qaRun.attempts=0;}d={ok:true,accepted:good,advance,step:qaRun.step,correctCount:qaRun.correct,wrongCount:qaRun.wrong,firstCount:qaRun.first,attempts:qaRun.attempts,finished:qaRun.step===qaRun.scene.satirlar.length};qaRun.last={requestId:b.requestId,result:d};}
else if(b.action==='dialogue_finish'){const passed=qaRun.correct/qaRun.scene.satirlar.length>=0.6,stars=passed?3:0;qaProgress[qaRun.scene.id]=stars;d={ok:true,passed,stars,correctCount:qaRun.correct,wrongCount:qaRun.wrong,xp:passed?40:0,gold:passed?50:0,progress:qaProgress,yo:{totalXp:passed?40:0,altin:passed?50:0,dmRewardVersion:1}};}
else throw Error('Unexpected request '+b.action);return {ok:true,json:async()=>d};};
`;
const resultStart=index.indexOf('<div class="gso-overlay" id="genelSonucOverlay"');
const resultBody=index.slice(resultStart,index.indexOf('<script>',resultStart));
const resultScript=index.slice(index.indexOf('let gsoAktif = null;'),index.indexOf('</script>',index.indexOf('let gsoAktif = null;')));
const scripts=bootstrap+'\n'+read('holiday-splashes/papi-intro.js')+'\n'+read('papi-dialogues.js')+'\n'+level+'\nconst YO_SOHBET=window.DMPapiDialogueCatalog;\n'+core+'\n'+route+'\n'+read('papi-chat.js')+'\n'+resultScript+'\n'+read('papi-mascot.js')+'\n'+read('game-feedback.js')+'\nwindow.dmApplyRewardState=(v)=>{qaWalletWrites++;Object.assign(yo,v)};\n'+read('sonuc-a.js')+'\n'+read('route-practice-flight.js')+'\nwindow.qaRealFlight=dmRoutePracticeFlight;window.dmRoutePracticeFlight={prepare(){},play(options){window.qaFlightOptions=options;return Promise.resolve(true)},cancel(){}};';
const body='<button id="entry" onclick="sohbetEkraniAc()">Papi Başlat</button><div id="panel-alani" style="display:block"></div><div id="tab-sohbet" class="dc-fullscreen-overlay"><button class="dc-exit-btn" onclick="sohbetEkraniKapat()">Sohbeti kapat</button><div class="sohbet-kap"><div id="kp-panel-sohbet"></div></div></div><nav id="bottomNavMobile">Alt menü</nav>'+resultBody;
function html(styles=''){return '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<style>body{margin:0;font-family:Nunito,system-ui,sans-serif}#tab-sohbet:not(.active){display:none!important}</style></head><body class="pk-sekmeli">'+body+'<script>'+scripts+'</script></body></html>';}
module.exports={html,scripts,body};

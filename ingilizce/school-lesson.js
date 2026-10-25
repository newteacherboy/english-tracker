/* School sessions use the same lesson renderer as Learning Route. */
(()=>{'use strict';
 const who=()=>(typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'')),identity=()=>who()+'|'+localStorage.getItem('ing_token');
 let active=null;
 const storageKey=(owner,no)=>'dm_school_shared_v1:'+owner+':'+no;
 async function start({D,b,d,pool,onFinish}){
  if(active)return;const owner=who(),at=identity(),key=storageKey(owner,D.no);let saved;
  try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch{}
  const state={runId:saved?.expires>Date.now()?saved.runId:crypto.randomUUID(),owner,at,D,b,d,started:saved?.expires>Date.now()?saved.started:Date.now(),answers:{},cursor:0,version:0};active=state;
  const current=()=>active===state&&identity()===at;
  const persist=()=>{if(current())try{localStorage.setItem(key,JSON.stringify({runId:state.runId,started:state.started,expires:state.started+20*60*1000}));}catch{}};
  const practice=!owner||owner.toLowerCase()==='teacher'||typeof siniftaOynananOgrenci!=='undefined'&&!!siniftaOynananOgrenci;
  try{
   persist();if(window.OC){OC.basla('ba');Object.assign(OC.aktif,{runId:state.runId,bas:state.started,rewardScope:{classNo:D.sinif,units:[D.unite],stopNo:D.no}});}
   const verified=practice?null:await window.dmVerifiedGames.start('ba',state.runId,{classNo:D.sinif,units:[D.unite],stopNo:D.no,schoolVersion:9},D.kelimeler);
   if(!current())return;
   const words=verified?.words||D.kelimeler.map(w=>({en:w.en||w.ingilizce,tr:w.tr||w.turkce}));
   const tasks=verified?.tasks||window.DMSchoolCurriculum.build(words,pool.map(w=>({en:w.en||w.ingilizce,tr:w.tr||w.turkce})),D.no);
   if(tasks.length!==12||tasks[0].schoolVersion!==9)throw Error('Okul Yolum güncellenemedi. Uygulamayı yenileyip tekrar dene.');
   state.answers=verified?.answers||{};if(window.OC)for(const [i,a] of Object.entries(state.answers)){if(Number(i)<2||!a.complete)continue;if(a.firstCorrect)OC.dogru(1);else OC.yanlis(false);}
   while(state.answers[state.cursor]?.complete&&state.cursor<tasks.length)state.cursor++;
   const combo=()=>{let n=0;for(let i=Math.min(state.cursor,tasks.length-1);i>=2;i--){const a=state.answers[i];if(!a)continue;if(!a.complete||!a.firstCorrect||a.misses>0)break;n++;}return n;};
   const view=(extra={})=>({ok:true,chapter:D.no,deckVersion:9,cursor:state.cursor,version:state.version,finished:state.cursor>=tasks.length,replay:false,wallet:{energy:window.genelEnerjiKalan??25,energyMax:25,gold:typeof yo!=='undefined'?yo.altin||0:0,combo:combo()},...extra});
   const charge=async()=>{if(practice)return;const r=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem:'ekonomi',is:'parkurAdim',ogrenci:owner,runId:state.runId,soru:state.cursor+1,dogru:null})}),j=await r.json();if(!r.ok||!j.ok)throw Object.assign(Error(j.mesaj||'Enerji doğrulanamadı.'),{energyEmpty:/enerji|energy/i.test(j.mesaj||''),enerjiKalan:window.genelEnerjiKalan,enerjiMax:25});if(Number.isFinite(j.enerjiKalan))window.genelEnerjiKalan=j.enerjiKalan;};
   const bridge={
    chapter:{id:D.no,number:D.no,routeNumber:d+1,cefr:D.sinif+'. Sınıf',theme:D.unite+'. Ünite',topicTitle:'Okul Yolum',title:'Okul Yolum',part:1,cards:words.map(w=>({...w,image:window.DMSchoolWordArt?.[w.en.toLowerCase()]})),examples:[],schoolTasks:tasks},session:view(),
    async request(action,payload){
     if(!current())throw Error('Hesap değişti.');if(action==='open'){if(!practice){const fresh=await window.dmVerifiedGames.start('ba',state.runId,{classNo:D.sinif,units:[D.unite],stopNo:D.no,schoolVersion:9},words);if(!current())throw Error('Hesap değişti.');state.answers=fresh.answers||{};state.cursor=0;while(state.answers[state.cursor]?.complete&&state.cursor<tasks.length)state.cursor++;state.version++;}return view();}
     if(!['advance','comboReset'].includes(action))throw Error('Geçersiz okul işlemi.');
     if(payload.cursor!==state.cursor||payload.version!==state.version)return view({stale:true});
     const task=tasks[state.cursor];if(!task)return view({accepted:true});
     if(action==='comboReset'&&task.kind==='teach')return view();
     const answer=action==='comboReset'?{mistake:true}:payload.answer,g=window.DMSchoolCurriculum.grade(task,answer);if(!g.valid)throw Error('Bu soru için bir cevap seç.');
     if(action!=='comboReset')await charge();if(!current())throw Error('Hesap değişti.');
     let result;if(practice){const old=state.answers[state.cursor]||{misses:0};result={correct:g.correct,complete:g.complete,firstCorrect:g.correct&&!old.misses};state.answers[state.cursor]={...result,misses:old.misses+(g.correct?0:1)};}
     else{window.dmVerifiedGames.record(state.cursor,answer,state.runId);result=await window.dmVerifiedGames.flush(state.runId);if(!current())throw Error('Hesap değişti.');if(result.duplicate){const fresh=await window.dmVerifiedGames.start('ba',state.runId,{classNo:D.sinif,units:[D.unite],stopNo:D.no,schoolVersion:9},words);result={...result,...fresh.answers[state.cursor]};}const old=state.answers[state.cursor]||{misses:0};state.answers[state.cursor]={complete:result.complete,correct:result.correct,firstCorrect:result.firstCorrect,misses:old.misses+(result.correct?0:1)};}
     const accepted=!!result.complete;if(accepted){if(state.cursor>=2&&window.OC){if(result.firstCorrect)OC.dogru(1);else OC.yanlis(false);}state.cursor++;state.version++;}persist();return view({accepted,correct:result.correct,comboGain:result.eklenen||0});
    },
    onClose(){if(active===state)active=null;},
    finish(){if(!current())return;const answers=tasks.slice(2).map((t,i)=>!!state.answers[i+2]?.firstCorrect);const stats={schoolVersion:9,runId:state.runId,bas:state.started,b,d,D:{...D,kelimeler:words},dogru:answers.filter(Boolean).length,yanlis:answers.filter(x=>!x).length,sonuclar:answers.map((a,i)=>i===answers.length-1?true:a),sorular:tasks.slice(2).map((t,i)=>({tip:i===answers.length-1?'sesliFinal':t.kind})),owner,finished:false};localStorage.removeItem(key);window.dmThematicLearning.close(true);onFinish(stats);}
   };
   await window.dmThematicLearning.openSchool(bridge);
  }catch(e){if(current())window.yoToast?.(e.message||'Okul Yolum yüklenemedi. İlerlemen korundu.');active=null;throw e;}
 }
 window.dmSchoolLesson={start};
 document.addEventListener('dm:login',()=>{active=null;});
})();

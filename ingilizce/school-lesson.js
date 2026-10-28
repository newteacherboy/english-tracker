/* School sessions use the same lesson renderer as Learning Route. */
(()=>{'use strict';
 const who=()=>(typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'')),identity=()=>who()+'|'+localStorage.getItem('ing_token');
 let active=null;
 const storageKey=(owner,no)=>'dm_school_shared_v1:'+owner+':'+no;
 async function start({D,b,d,pool,onFinish,entryMeta={}}){
  if(active)return;const owner=who(),at=identity(),key=storageKey(owner,D.no);let saved;
  try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch{}
  const practiceMode=!owner||owner.toLowerCase()==='teacher'||typeof siniftaOynananOgrenci!=='undefined'&&!!siniftaOynananOgrenci;
  const state={runId:saved?.expires>Date.now()?saved.runId:(!practiceMode&&window.dmVerifiedGames?.nextRun?.(D.no))||crypto.randomUUID(),owner,at,D,b,d,started:saved?.expires>Date.now()?saved.started:Date.now(),answers:{},cursor:0,version:0};active=state;
  const current=()=>active===state&&identity()===at;
  const persist=()=>{if(current())try{localStorage.setItem(key,JSON.stringify({runId:state.runId,started:state.started,expires:state.started+20*60*1000}));}catch{}};
  const practice=!owner||owner.toLowerCase()==='teacher'||typeof siniftaOynananOgrenci!=='undefined'&&!!siniftaOynananOgrenci;
  try{
   persist();if(window.OC){OC.basla('ba');Object.assign(OC.aktif,{runId:state.runId,bas:state.started,rewardScope:{classNo:D.sinif,units:[D.unite],stopNo:D.no}});}
   const verified=practice?null:await window.dmVerifiedGames.start('ba',state.runId,{classNo:D.sinif,units:[D.unite],stopNo:D.no,schoolVersion:9},D.kelimeler);state.justStarted=true;
   if(!current())return;
   const words=verified?.words||D.kelimeler.map(w=>({en:w.en||w.ingilizce,tr:w.tr||w.turkce}));
   const tasks=verified?.tasks||window.DMSchoolCurriculum.build(words,pool.map(w=>({en:w.en||w.ingilizce,tr:w.tr||w.turkce})),D.no);
   if(tasks.length!==12||tasks[0].schoolVersion!==9)throw Error('Okul Yolum güncellenemedi. Uygulamayı yenileyip tekrar dene.');
   state.answers=verified?.answers||{};if(window.OC)for(const [i,a] of Object.entries(state.answers)){if(Number(i)<2||!a.complete)continue;if(a.firstCorrect)OC.dogru(1);else OC.yanlis(false);}
   while(state.answers[state.cursor]?.complete&&state.cursor<tasks.length)state.cursor++;
   const combo=()=>{let n=0;for(let i=Math.min(state.cursor,tasks.length-1);i>=2;i--){const a=state.answers[i];if(!a)continue;if(!a.complete||!a.firstCorrect||a.misses>0)break;n++;}return n;};
   const view=(extra={})=>({ok:true,chapter:D.no,deckVersion:9,cursor:state.cursor,version:state.version,finished:state.cursor>=tasks.length,replay:false,wallet:{energy:window.genelEnerjiKalan??25,energyMax:25,gold:typeof yo!=='undefined'?yo.altin||0:0,combo:combo()},...extra});
   /* [Kota 28 Eki 2026] Enerji ayrı istekle düşülmez: sunucu cevap paketini kaydederken soru başına enerjiyi kendisi düşer
      (ilk 2 öğretme adımı ücretsiz). Telefon enerjiyi yerelde takip eder; bitince önce bekleyen cevapları gönderir,
      sunucu da enerji yok derse bugünkü enerji kartı gösterilir. */
   const energyLeft=()=>Number.isFinite(Number(window.genelEnerjiKalan))?Number(window.genelEnerjiKalan):25;
   const setEnergy=n=>{window.genelEnerjiKalan=Math.max(0,Math.min(25,n));window.headerEnerjiGoster?.(window.genelEnerjiKalan,25);};
   const charge=async()=>{if(practice||state.cursor<2)return;
    if(energyLeft()<1){try{await window.dmVerifiedGames.flush(state.runId);}catch(e){if(!e.energyEmpty)throw e;}}
    if(energyLeft()<1)throw Object.assign(Error('Enerji yetersiz'),{energyEmpty:true,enerjiKalan:0,enerjiMax:25});};
   const bridge={
    entryMeta:{title:entryMeta.title||'Okul Yolum',completed:!!entryMeta.completed,part:D.parca,total:D.parcaToplam},
    chapter:{id:D.no,number:D.no,routeNumber:d+1,cefr:D.sinif+'. Sınıf',theme:D.unite+'. Ünite',topicTitle:'Okul Yolum',title:'Okul Yolum',part:1,cards:words.map(w=>({...w,image:window.DMSchoolWordArt?.[w.en.toLowerCase()]})),examples:[],schoolTasks:tasks},session:view(),
    async request(action,payload){
     if(!current())throw Error('Hesap değişti.');if(action==='open'){if(state.justStarted){state.justStarted=false;return view();}/* [28 Eki 2026] oturum az önce başlatıldı: ikinci başlatma/durum isteği gereksiz */if(!practice){const fresh=await window.dmVerifiedGames.start('ba',state.runId,{classNo:D.sinif,units:[D.unite],stopNo:D.no,schoolVersion:9},words);if(!current())throw Error('Hesap değişti.');state.answers=fresh.answers||{};state.cursor=0;while(state.answers[state.cursor]?.complete&&state.cursor<tasks.length)state.cursor++;state.version++;}return view();}
     if(!['advance','comboReset'].includes(action))throw Error('Geçersiz okul işlemi.');
     if(payload.cursor!==state.cursor||payload.version!==state.version)return view({stale:true});
     const task=tasks[state.cursor];if(!task)return view({accepted:true});
     if(action==='comboReset'&&task.kind==='teach')return view();
     const answer=action==='comboReset'?{mistake:true}:payload.answer,g=window.DMSchoolCurriculum.grade(task,answer);if(!g.valid)throw Error('Bu soru için bir cevap seç.');
     const wasComplete=!!state.answers[state.cursor]?.complete;await charge();if(!current())throw Error('Hesap değişti.');
     // Sonuç telefonda anında hesaplanır (sunucu paket gelince aynı cevabı kendi anahtarıyla tekrar puanlar; ödülü sunucu belirler).
     const old=state.answers[state.cursor]||{misses:0};const result={correct:g.correct,complete:g.complete,firstCorrect:g.correct&&!old.misses,eklenen:0};
     state.answers[state.cursor]={complete:result.complete,correct:result.correct,firstCorrect:result.firstCorrect,misses:old.misses+(g.correct?0:1)};
     if(!practice){window.dmVerifiedGames.record(state.cursor,answer,state.runId);
      if(result.complete&&!wasComplete&&state.cursor>=2){let e=energyLeft()-1;
       // Sunucunun kombo kuralı: 3. adımdan itibaren üst üste 5 ilk-denemede-doğru cevapta +1 enerji.
       if(result.firstCorrect){let n=0;for(let i=state.cursor;i>=2;i--){const x=state.answers[i];if(x?.complete&&x.firstCorrect)n++;else break;}if(n>=5&&n%5===0){e+=1;result.eklenen=1;}}
       setEnergy(e);}}
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

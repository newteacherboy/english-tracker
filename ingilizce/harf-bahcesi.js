(function () {
  'use strict';
  const KEY = 'harfbahcesi', COLS = 6, ROWS = 4;
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const en = k => String(k.ingilizce || k.en || '').trim().toLowerCase();
  const tr = k => String(k.turkce || k.tr || '').trim();
  const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  function pool(items) { const seen=new Set(); return items.filter(k=>{const w=en(k);if(!/^[a-z]{2,12}$/.test(w)||!tr(k)||seen.has(w))return false;seen.add(w);return true;}); }
  function adjacent(a,b) { return a!==b && Math.abs(a%COLS-b%COLS)<=1 && Math.abs(Math.floor(a/COLS)-Math.floor(b/COLS))<=1; }
  function board(words) {
    let route=Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>r*COLS+(r%2?COLS-1-c:c))).flat();
    if(Math.random()<.5)route.reverse();
    if(Math.random()<.5)route=route.map(i=>Math.floor(i/COLS)*COLS+COLS-1-i%COLS);
    const letters=Array.from({length:COLS*ROWS},()=> 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random()*26)]),paths=[];
    let offset=0;
    words.forEach(k=>{const w=en(k),path=route.slice(offset,offset+w.length);path.forEach((p,i)=>letters[p]=w[i]);paths.push(path);offset+=w.length;});
    return {letters,paths};
  }
  window.dmHarfBahcesiCore = Object.freeze({pool,board,adjacent,en,tr});
  let overlay=null,body=null,state=null,timer=null,owner='',previous=null,starting=false;
  const who=()=>typeof aktifOgrenciAdi!=='undefined'?aktifOgrenciAdi:'';
  const classroom=()=>typeof siniftaOynananOgrenci!=='undefined'&&!!siniftaOynananOgrenci;
  const name=()=>classroom()?siniftaOynananOgrenci:who();
  function close() { clearInterval(timer);timer=null;overlay?.remove();overlay=null;body=null;state=null;previous?.focus?.(); }
  function message(text) { const p=overlay?.querySelector('.hb-status');if(p)p.textContent=text; }
  function chooseClass(n) {
    state.classNo=n;overlay.querySelectorAll('.sinif-btn').forEach(b=>b.classList.toggle('active',Number(b.dataset.class)===n));
    genericSinifGuncelle(n,'hbUnits',u=>state.units=u);
  }
  window.harfBahcesiAc=function() {
    if(window.dmFeatureEnabled?.('oyun_harfbahcesi')===false || genelOyunGirisEngelliMi())return;
    close();owner=who();previous=document.activeElement;
    overlay=document.createElement('div');overlay.className='hb-overlay game-modal-overlay';overlay.id='harfBahcesiOverlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','hbTitle');
    overlay.innerHTML=`<section class="hb-card"><header><div><small>PAPİ'NİN KELİME BAHÇESİ</small><h2 id="hbTitle">🌿 Harf Bahçesi</h2></div><button type="button" data-close aria-label="Oyunu kapat">×</button></header><div class="hb-body"></div></section>`;
    document.body.append(overlay);body=overlay.querySelector('.hb-body');overlay.querySelector('[data-close]').onclick=close;
    overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const a=[...overlay.querySelectorAll('button:not(:disabled),input,select')].filter(x=>x.getClientRects().length);if(!a.length)return;const first=a[0],last=a.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
    state={classNo:1,units:[1],ended:false,runId:crypto.randomUUID()};
    body.innerHTML=`<div class="hb-intro"><img src="mascot-welcome.webp" alt="Papi"><p>Türkçe ipucundan İngilizce kelimeyi bul. Bitişik harflere sırayla dokun ya da parmağını kaydır!</p></div><p>8 kelime · En fazla 1000 puan · 3 ⚡<br><small>İlk denemede +100; düzeltince +50. Seri bonusları diğer oyunlarla aynı.</small></p><h3>Sınıfını seç</h3><div id="hbClasses" class="hb-classes">${Array.from({length:8},(_,i)=>`<button type="button" class="sinif-btn" data-class="${i+1}">${i+1}. Sınıf</button>`).join('')}</div><h3>Ünitelerini seç</h3><div id="hbUnits" class="unite-secim-box hb-units"></div><p class="hb-status" role="status"></p><button class="hb-primary" type="button" data-start>Bahçeye gir 🌱</button>`;
    overlay.querySelectorAll('[data-class]').forEach(b=>b.onclick=()=>chooseClass(Number(b.dataset.class)));
    sinifGridKisitlamaUygula('hbClasses',n=>state.classNo=n,chooseClass);
    overlay.querySelector('[data-start]').onclick=start;overlay.querySelector('[data-close]').focus();
  };
  async function start() {
    if(starting||!state||state.ended||!overlay)return;
    if(window.dmFeatureEnabled?.('oyun_harfbahcesi')===false)return message('Bu oyun şu anda kapalı.');
    const available=pool(oyunHavuzGetir(state.classNo,state.units));
    if(available.length<8)return message('Seçtiğin ünitelerde en az 8 farklı, tek sözcüklü kelime gerekli. Başka bir ünite daha seç.');
    if(!name())return message('Önce öğrenci hesabına giriş yap veya Sınıf Oyun Modu’nda öğrenci seç.');
    const current=state,currentOverlay=overlay,student=name(),button=overlay.querySelector('[data-start]');
    starting=true;button.disabled=true;message('Bahçe hazırlanıyor…');
    try {
      if(!classroom()) {
        if(typeof window.genelEnerjiKalan==='number'&&window.genelEnerjiKalan<3)throw Error('Oynamak için 3 enerji gerekli.');
        const r=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem:'enerjiDegistir',ogrenci:student,fark:-3,sebep:'oyun',oyun:KEY,runId:current.runId})});
        const d=await r.json();if(!r.ok||d.ok===false||d.status==='error'||Number(d.eklenen)!==-3)throw Error(d.mesaj||'Enerji doğrulanamadı. Tekrar dene.');
        if(typeof headerEnerjiGoster==='function')headerEnerjiGoster(d.enerjiKalan,d.enerjiMax);
        if(typeof genelEnerjiDegisimGoster==='function')genelEnerjiDegisimGoster(-3);
      }
      if(state!==current||overlay!==currentOverlay||who()!==owner)return;
      Object.assign(state,{words:OC.kelimeSec(KEY,available,8),index:0,done:0,solved:new Set(),selected:[],misses:new Set(),started:Date.now(),student});
      OC.basla(KEY);newBoard();
      timer=setInterval(()=>{if(who()!==owner||!overlay){close();return;}const t=overlay.querySelector('[data-time]');if(t)t.textContent=OC.sure()+' sn';},1000);
    } catch(e) { if(state===current&&overlay===currentOverlay){message(e.message);button.disabled=false;} }
    finally {starting=false;}
  }
  function newBoard() {state.pair=state.words.slice(state.index,state.index+2);state.grid=board(state.pair);state.selected=[];state.solved=new Set();paint();}
  function text() {return state.selected.map(i=>state.grid.letters[i]).join('');}
  function paint() {
    const s=state;
    body.innerHTML=`<div class="hb-meta"><b>${s.done}/8 kelime</b><span>${OC.puan()} puan</span><span data-time>${OC.sure()} sn</span></div><progress max="8" value="${s.done}" aria-label="Bulunan kelimeler"></progress><div class="hb-hints">${s.pair.map((k,i)=>`<div class="${s.solved.has(i)?'hb-solved':''}"><span>${esc(tr(k))}</span><b lang="en">${s.solved.has(i)?esc(en(k).toUpperCase()):'•'.repeat(en(k).length)}</b></div>`).join('')}</div><div class="hb-grid" aria-label="Harf bahçesi">${s.grid.letters.map((h,i)=>`<button type="button" data-cell="${i}" lang="en" aria-label="${h.toUpperCase()}, ${Math.floor(i/COLS)+1}. satır ${i%COLS+1}. sütun">${h.toUpperCase()}</button>`).join('')}</div><div class="hb-selection" lang="en" aria-live="polite">Harfleri birleştir</div><div class="hb-actions"><button type="button" data-clear>Temizle</button><button type="button" class="hb-primary" data-check>Kelimeyi bul ✓</button><button type="button" data-skip>Pas geç</button></div><p class="hb-status" role="status">Yatay, dikey veya çapraz komşu harfleri birleştir. Bir harfi aynı kelimede iki kez kullanamazsın.</p><button type="button" class="hb-next" data-next hidden>${s.index+2>=8?'Sonucumu gör 🌟':'Sonraki bahçe →'}</button>`;
    body.querySelectorAll('[data-cell]').forEach(b=>b.onclick=()=>select(Number(b.dataset.cell)));
    body.querySelector('[data-clear]').onclick=()=>{s.selected=[];selection();};body.querySelector('[data-check]').onclick=check;
    body.querySelector('[data-skip]').onclick=()=>{const i=s.pair.findIndex((_,j)=>!s.solved.has(j));if(i<0)return;OC.yanlis();s.solved.add(i);s.done++;s.selected=[];paint();message('Tekrar çalış: '+tr(s.pair[i])+' → '+en(s.pair[i]));};
    body.querySelector('[data-next]').onclick=()=>{if(s.solved.size!==s.pair.length)return;s.index+=2;if(s.index>=s.words.length)finish();else newBoard();};
    let dragging=false,moved=false,startIndex=-1;
    const grid=body.querySelector('.hb-grid');
    grid.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;const b=e.target.closest('[data-cell]');if(!b)return;dragging=true;moved=false;startIndex=Number(b.dataset.cell);});
    grid.addEventListener('pointermove',e=>{if(!dragging)return;const b=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-cell]');if(!b||!grid.contains(b))return;const i=Number(b.dataset.cell);if(i===startIndex&&!moved)return;if(!moved){select(startIndex);moved=true;}select(i);});
    grid.addEventListener('pointerup',e=>{if(dragging&&moved){e.preventDefault();grid.dataset.ignoreClick='1';setTimeout(()=>delete grid.dataset.ignoreClick,0);}dragging=false;});
    grid.addEventListener('pointercancel',()=>dragging=false);
    grid.addEventListener('click',e=>{if(grid.dataset.ignoreClick){e.stopImmediatePropagation();e.preventDefault();}},true);
    selection();if(s.solved.size===s.pair.length){body.querySelector('[data-next]').hidden=false;body.querySelectorAll('[data-check],[data-skip]').forEach(b=>b.disabled=true);}
  }
  function select(i) {
    if(!state||state.ended||state.solved.size===state.pair.length)return;
    const a=state.selected;
    if(a.at(-2)===i){a.pop();selection();return;}
    if(a.includes(i)||a.length>=12)return;
    if(a.length&&!adjacent(a.at(-1),i))return;
    a.push(i);selection();
  }
  function selection() {
    body.querySelector('.hb-selection').textContent=text().toUpperCase()||'Harfleri birleştir';
    body.querySelectorAll('[data-cell]').forEach(b=>{const i=Number(b.dataset.cell);b.classList.toggle('hb-picked',state.selected.includes(i));b.classList.toggle('hb-found',[...state.solved].some(j=>state.grid.paths[j].includes(i)));b.setAttribute('aria-pressed',String(state.selected.includes(i)));});
  }
  function check() {
    if(!state||state.ended||!state.selected.length||state.solved.size===state.pair.length)return;
    const word=text(),i=state.pair.findIndex((k,j)=>!state.solved.has(j)&&en(k)===word);
    if(i<0){OC.yanlis();state.pair.forEach((_,j)=>{if(!state.solved.has(j))state.misses.add(state.index+j);});state.selected=[];selection();message('Bu kelime ipuçlarına uymadı. Yeniden dene!');return;}
    const clean=!state.misses.has(state.index+i);OC.dogru(clean?1:.5,clean);state.solved.add(i);state.done++;state.selected=[];paint();window.dmCorrectAnswer?.();message('🌸 '+en(state.pair[i]).toUpperCase()+' = '+tr(state.pair[i]));
  }
  async function finish() {
    if(!state||state.ended)return;state.ended=true;clearInterval(timer);timer=null;
    const s=state,result=OC.sonlandir(KEY),savedOverlay=overlay;
    body.innerHTML='<p class="hb-status" role="status">Sonucun kaydediliyor…</p>';
    let saved=classroom(),failure='';
    if(!classroom())try {const r=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem:'harfBahcesiLiderlikKaydet',isim:s.student,sinif:s.classNo+'. Sınıf',unite:s.units.join(', ')+'. Ünite',puan:result.puan,dogru:result.dogru,yanlis:result.yanlis,suresaniye:result.sure,puanSurum:2,runId:s.runId})});const d=await r.json();if(!r.ok||d.status!=='success')throw Error(d.mesaj||d.message||'Sunucuya ulaşılamadı');saved=true;}catch(e){failure=e.message;}
    if(overlay!==savedOverlay||state!==s||who()!==owner)return;
    body.innerHTML=`<div class="hb-finish"><img src="mascot-reward.webp" alt="Kutlayan Papi"><h3>${result.dogru===8?'Bahçen çiçek açtı!':'Her kelime yeni bir filiz!'}</h3><p>${saved?'Sonucun kaydedildi.':'Sonuç kaydedilemedi: '+esc(failure)}</p>${!saved?'<button type="button" class="hb-primary" data-retry-save>Kaydı tekrar dene</button>':''}<p>${result.dogru} doğru · ${result.yanlis} yanlış · ${result.puan} puan</p><button type="button" class="hb-primary" data-result ${saved?'':'disabled'}>Sonucumu gör</button></div>`;
    const retry=body.querySelector('[data-retry-save]');if(retry)retry.onclick=()=>{s.ended=false;finish();};
    body.querySelector('[data-result]').onclick=()=>{if(s.shown)return;s.shown=true;close();genelSonucEkraniGoster({oyunAdi:'🌿 Harf Bahçesi',oyunKey:KEY,isim:s.student,puan:result.puan,dogru:result.dogru,yanlis:result.yanlis,sureSaniye:result.sure,yildiz:result.yildiz,siralamaYok:classroom(),devamFn:()=>{},tekrarFn:window.harfBahcesiAc});if(saved&&!classroom())fetch(apiURL+'?islem=harfBahcesiLiderlikTumunuGetir&sinif='+s.classNo+'&donem=hafta').then(r=>r.json()).then(l=>{if(Array.isArray(l))genelSonucSiralamaCiz(l,s.student);}).catch(()=>{const el=document.getElementById('gsoSiralama');if(el)el.textContent='Sıralama şu anda yüklenemedi.';});};
  }
  function addCard(){const grid=document.querySelector('#tab-aktiviteler .az-grid2x2');if(!grid||document.getElementById('hbActivityCard'))return;const b=document.createElement('button');b.type='button';b.id='hbActivityCard';b.className='az-gcard';b.dataset.dmParty='solo';b.setAttribute('onclick','harfBahcesiAc()');b.innerHTML='<div class="az-gcard-icon">🌿</div><div class="az-gcard-title">Harf Bahçesi</div><div class="ak-acik">Komşu harfleri birleştir, kelimeleri çiçeklendir</div><span class="ak-etiket">🔤 Yazım · 3 ⚡</span>';grid.append(b);}
  addCard();setTimeout(addCard,1800);
})();

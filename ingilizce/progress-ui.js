(function(){
  'use strict';
  const rules=window.DijiProgressRules;
  let last='',owner='',prior;
  const ready=()=>typeof yo!=='undefined'&&yo&&typeof yoHazirMi==='function'&&yoHazirMi()&&typeof aktifOgrenciAdi!=='undefined'&&aktifOgrenciAdi&&aktifOgrenciAdi.toLowerCase()!=='teacher';
  const read=()=>rules.progress(rules.migrate(yo));
  const milestones=[{level:2,name:'Ders Çalış',icon:'📘'},{level:3,name:'İlk oyun',icon:'🎮'},{level:10,name:'Yeni parkur',icon:'🗺️'},{level:15,name:'Jokerler',icon:'✨'},{level:20,name:'Düello',icon:'⚔️'},{level:30,name:'İki kişilik oyunlar',icon:'🤝'},{level:40,name:'Yolculuğun zirvesi',icon:'🏰'}];
  function close(){document.getElementById('dmProgressOverlay')?.remove();prior?.focus?.();}
  function open(){if(!ready())return;close();const p=read();prior=document.activeElement;
    const el=document.createElement('div');el.id='dmProgressOverlay';el.className='dm-progress-overlay';
    el.innerHTML='<section class="dm-progress-sheet" role="dialog" aria-modal="true" aria-labelledby="dmProgressTitle"><button class="dm-progress-close" aria-label="Paneli kapat">×</button><div class="dm-progress-shield">'+p.level+'</div><h2 id="dmProgressTitle">Seviye '+p.level+'</h2><p class="dm-progress-caption">'+(p.level<6?'Yolculuğun yeni başlıyor':'Her adımda biraz daha güçleniyorsun')+'</p><b class="dm-progress-total">Toplam '+p.xp.toLocaleString('tr-TR')+' XP</b><div class="dm-progress-track" role="progressbar" aria-label="Seviye ilerlemesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(p.ratio*100)+'"><i style="width:'+p.ratio*100+'%"></i></div><p class="dm-progress-remaining">'+(p.next===null?'40. seviyeye ulaştın!':(p.level+1)+'. seviyeye '+p.remaining.toLocaleString('tr-TR')+' XP kaldı')+'</p><small>'+p.xp.toLocaleString('tr-TR')+(p.next===null?' XP':' / '+p.next.toLocaleString('tr-TR')+' XP')+'</small><h3>Seviye yolculuğun</h3><div class="dm-progress-milestones">'+milestones.filter(m=>m.level>p.level).slice(0,3).map(m=>'<div><span>'+m.icon+'</span><b>'+m.name+'</b><small>Seviye '+m.level+'</small></div>').join('')+'</div><p class="dm-progress-note">Seviyen kalıcıdır. Altın harcamak seviyeni düşürmez.</p><button class="dm-progress-go">Parkura devam et</button></section>';
    el.querySelector('.dm-progress-close').onclick=close;el.querySelector('.dm-progress-go').onclick=()=>{close();window.dunyaAc?.();};
    el.onclick=e=>{if(e.target===el)close();};
    el.onkeydown=e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const buttons=[...el.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}};
    document.body.append(el);el.querySelector('.dm-progress-close').focus();
  }
  function paint(){const bar=document.querySelector('#panel-alani .header-right-widgets');if(!bar)return;
    if(!ready()){document.getElementById('dmLevelBadge')?.remove();close();last='';owner='';return;}
    if(owner!==aktifOgrenciAdi){close();last='';owner=aktifOgrenciAdi;}
    let button=document.getElementById('dmLevelBadge');if(!button){button=document.createElement('button');button.id='dmLevelBadge';button.className='dm-level-badge';button.type='button';button.onclick=open;bar.prepend(button);}
    const p=read(),key=p.level+':'+p.xp;if(key===last)return;last=key;
    button.setAttribute('aria-label','Seviye '+p.level+'. '+(p.next===null?'En yüksek seviye.':p.remaining+' XP sonra yeni seviye.')+' İlerlemeni görüntüle');
    button.innerHTML='<span>🛡️ <b>Sv. '+p.level+'</b></span><span class="dm-level-track"><i style="width:'+p.ratio*100+'%"></i></span>';
  }
  window.dmProgressPanel={open,close,paint};
  // Keep owned joker inventory intact, but only permit use from level 15.
  const oldUse=window.jokerKullan;
  if(typeof oldUse==='function')window.jokerKullan=function(){if(ready()&&read().level<15){window.yoToast?.('✨ Jokerler 15. seviyede açılır.');return;}return oldUse.apply(this,arguments);};
  const oldBar=window.jokerBarCiz;
  if(typeof oldBar==='function')window.jokerBarCiz=function(){const result=oldBar.apply(this,arguments),bar=document.getElementById('jkBar');if(bar&&ready()&&read().level<15){bar.querySelectorAll('button').forEach(b=>{b.disabled=true;b.title='Jokerler 15. seviyede açılır';});}return result;};
  setInterval(paint,1000);paint();
})();

/* Forest profile: move existing controls, never duplicate student data or canvases. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const placements = new Map();
  let chartSources = null, badgeObserver = null;
  const originals = new WeakMap();
  function move(node, parent) {
    if (!node || !parent) return;
    if (!placements.has(node)) {
      const marker = document.createComment('forest-profile-position');
      node.before(marker); placements.set(node, marker);
    }
    parent.append(node);
  }
  function restore() {
    for (const [node, marker] of placements) { marker.replaceWith(node); }
    placements.clear();
    badgeObserver?.disconnect(); badgeObserver=null;
    document.querySelectorAll('.dm-forest-caption,.dm-forest-papi,.dm-forest-tools,#dmForestBadgeToggle,#dmForestBadgeEmpty,.dm-chart-empty,#dmMyWorldTasks').forEach(n=>n.remove());
    ['gelisimGrafik','kriterGrafik','denemeGrafik'].forEach(id=>{if($(id))$(id).hidden=false;});
    $('rozetlerGridKonteyner')?.classList.remove('dm-badges-expanded');
    $('dmForestGrowth')?.remove(); $('dmForestActions')?.remove(); $('dmWorldTabs')?.remove();
    document.body.classList.remove('dm-profile-open');
    styleCharts(false);
  }
  function styleCharts(forest) {
    if (!window.Chart?.getChart) return;
    ['gelisimGrafik', 'kriterGrafik', 'denemeGrafik'].forEach((id, index) => {
      const canvas = $(id), chart = canvas && Chart.getChart(canvas);
      if (!chart) return;
      const dataset = chart.data.datasets[0];
      if (!originals.has(chart)) originals.set(chart, {
        borderColor: dataset.borderColor, backgroundColor: dataset.backgroundColor,
        borderRadius: dataset.borderRadius, pointRadius: dataset.pointRadius,
        pointHoverRadius: dataset.pointHoverRadius, borderWidth: dataset.borderWidth,
        gridX: chart.options.scales.x.grid.color, gridY: chart.options.scales.y.grid.color,
        tickX: chart.options.scales.x.ticks.color, tickY: chart.options.scales.y.ticks.color
      });
      const old = originals.get(chart);
      Object.assign(dataset, forest ? {
        borderColor: '#369d85', backgroundColor: index === 0 ? 'rgba(96,196,161,.18)' : index === 1 ? ['#8ccfba','#9dc8e0','#ecd18a','#b9a9df','#e3ada5'] : '#9acdb6',
        borderRadius: 8, pointRadius: index === 0 ? 3 : old.pointRadius,
        pointHoverRadius: 6, borderWidth: index === 0 ? 3 : 0
      } : {borderColor:old.borderColor,backgroundColor:old.backgroundColor,borderRadius:old.borderRadius,pointRadius:old.pointRadius,pointHoverRadius:old.pointHoverRadius,borderWidth:old.borderWidth});
      chart.options.scales.x.grid.color = forest ? '#f1ede4' : old.gridX;
      chart.options.scales.y.grid.color = forest ? '#eee8db' : old.gridY;
      chart.options.scales.x.ticks.color = forest ? '#63796b' : old.tickX;
      chart.options.scales.y.ticks.color = forest ? '#63796b' : old.tickY;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `${['Puan gelişimi','Beceri ortalamaları','Deneme sonuçları'][index]}: ${chart.data.labels.map((label,i)=>`${label}: ${dataset.data[i] ?? 0}`).join(', ')}`);
      chart.update('none'); chart.resize();
    });
  }
  function emptyStates() {
    if (!chartSources) return;
    ['gelisimGrafik','kriterGrafik','denemeGrafik'].forEach((id,index) => {
      const canvas=$(id), box=canvas?.closest('.chart-box'); if(!box) return;
      let note=box.querySelector('.dm-chart-empty');
      if(!note){note=document.createElement('p');note.className='dm-chart-empty';box.append(note);}
      const empty=index===0 ? !chartSources.history : index===2 ? !chartSources.exams : !chartSources.skills;
      note.textContent=index===2 ? 'İlk deneme sonucundan sonra grafiğin burada görünecek.' : index===1 ? 'Beceri puanların oluştuğunda burada görünecek.' : 'İlk puanın kaydedildiğinde gelişim yolculuğun burada başlayacak.';
      note.hidden=!empty; canvas.hidden=empty;
    });
  }
  function badgeState() {
    const grid=$('rozetlerGridKonteyner'),button=$('dmForestBadgeToggle');
    if(!grid||!button) return;
    button.hidden=grid.children.length<=4;
    let note=$('dmForestBadgeEmpty');
    if(!note){note=document.createElement('p');note.id='dmForestBadgeEmpty';note.className='dm-chart-empty';grid.after(note);}
    note.textContent='Rozetlerin burada birikecek.'; note.hidden=grid.children.length>0;
  }
  function prepare() {
    const head=$('profilAlan')?.querySelector('.user-header-bar'),summary=$('tab-ozet');
    if(!head||!summary) return;
    document.body.classList.add('dm-profile-open');
    if(!head.querySelector('.dm-forest-papi')){
      const img=document.createElement('img');img.className='dm-forest-papi';img.src='papi-welcome-v2.png';img.alt='';img.setAttribute('aria-hidden','true');head.prepend(img);
      const caption=document.createElement('div');caption.className='dm-forest-caption';caption.textContent='ORMAN KAŞİFİ';head.prepend(caption);
    }
    let tools=head.querySelector('.dm-forest-tools');
    if(!tools){tools=document.createElement('div');tools.className='dm-forest-tools';head.append(tools);}
    ['ybEnerji','ybArac'].forEach(id=>move($(id),tools));
    const badges=$('rozetlerBolumu');
    if(!$('dmForestBadgeToggle')){
      const button=document.createElement('button');button.id='dmForestBadgeToggle';button.type='button';button.className='dm-forest-link';button.textContent='Tüm rozetleri gör';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','rozetlerGridKonteyner');
      button.onclick=()=>{const expanded=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(expanded));button.textContent=expanded?'Daha az göster':'Tüm rozetleri gör';$('rozetlerGridKonteyner').classList.toggle('dm-badges-expanded',expanded);};
      badges?.querySelector('.badges-header-box')?.append(button);
      if($('rozetlerGridKonteyner')) {badgeObserver=new MutationObserver(badgeState);badgeObserver.observe($('rozetlerGridKonteyner'),{childList:true});}
    }
    badgeState();
    // Unified dashboard entry: reuse the existing Sana Ozel screen and its live data.
    if(!$('dmMyWorldTasks')){
      const tasks=document.createElement('section');tasks.id='dmMyWorldTasks';tasks.className='dm-my-world-tasks';
      tasks.innerHTML='<div class="dm-forest-section-heading"><h2>🎯 Sana Özel</h2><span>Görevlerim ve haftalık hedefim</span></div><p>Günlük görevlerini, haftalık hedeflerini ve ödüllerini aynı merkezden yönet.</p><button type="button" class="dm-my-world-open">Günün 3 Görevini ve Hedefimi Gör →</button>';
      const summary=$('tab-ozet');if(summary){summary.prepend(tasks);tasks.querySelector('button').addEventListener('click',()=>{const target=document.querySelector('#bottomNavMobile .bn-item[data-ekran="tab-sanaozel"]');if(target){target.click();}else{document.querySelector('[data-ekran="tab-sanaozel"]')?.click();}});}
    }
    // My World: switch existing profile content without cloning charts or student state.
    if(!$('dmWorldTabs')){
      const nav=document.createElement('nav');nav.id='dmWorldTabs';nav.className='dm-world-tabs';nav.setAttribute('aria-label','Benim Dünyam bölümleri');
      nav.innerHTML='<button type="button" data-world="tasks" aria-pressed="true">Sana Özel</button><button type="button" data-world="stats" aria-pressed="false">İstatistik</button><button type="button" data-world="badges" aria-pressed="false">Rozetler</button><button type="button" data-world="character" aria-pressed="false">Karakter</button>';
      summary.prepend(nav);
      const task=$('dmMyWorldTasks');
      const setWorld=mode=>{
        nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.world===mode)));
        if(task)task.hidden=mode!=='tasks';
        if($('dmForestGrowth'))$('dmForestGrowth').hidden=mode!=='stats';
        if(badges)badges.hidden=mode!=='badges';
        if($('dmForestActions'))$('dmForestActions').hidden=mode!=='character';
        if(mode==='stats')requestAnimationFrame(()=>styleCharts(true));
      };
      nav.querySelectorAll('button').forEach(b=>b.onclick=()=>setWorld(b.dataset.world));
      setWorld('tasks');
    }
    const growth=document.createElement('section');growth.id='dmForestGrowth';growth.setAttribute('aria-labelledby','dmForestGrowthTitle');
    growth.innerHTML='<div class="dm-forest-section-heading"><h2 id="dmForestGrowthTitle">🌿 Gelişimim</h2><span>Her adım bir keşif</span></div>';
    badges ? badges.after(growth) : summary.append(growth);
    move($('gelisimGrafikKutusu'),growth);
    [['kriterGrafik','Beceri haritam'],['denemeGrafik','Deneme yolculuğum']].forEach(([id,title])=>{
      const details=document.createElement('details');details.className='dm-forest-detail';const label=document.createElement('summary');label.textContent=title;details.append(label);growth.append(details);move($(id)?.closest('.chart-box'),details);
      details.addEventListener('toggle',()=>{if(details.open)requestAnimationFrame(()=>styleCharts(true));});
    });
    const actions=document.createElement('div');actions.id='dmForestActions';summary.after(actions);move(head.querySelector('.user-actions'),actions);
    const current=$('dmWorldTabs')?.querySelector('[aria-pressed="true"]')?.dataset.world||'tasks';
    if($('dmForestGrowth'))$('dmForestGrowth').hidden=current!=='stats';
    if(badges)badges.hidden=current!=='badges';
    if($('dmForestActions'))$('dmForestActions').hidden=current!=='character';
    emptyStates();requestAnimationFrame(()=>styleCharts(true));
  }
  const open=window.profilAc,close=window.dcTumTamEkranlariKapat;
  if(typeof open==='function')window.profilAc=function(){restore();const result=open.apply(this,arguments);prepare();return result;};
  if(typeof close==='function')window.dcTumTamEkranlariKapat=function(){restore();return close.apply(this,arguments);};
  const draw=window.grafikliCiz;
  if(typeof draw==='function')window.grafikliCiz=function(history,user,exams){
    const result=draw.apply(this,arguments);
    chartSources={history:history?.length||0,exams:exams?.length||0,skills:['okumaOrt','yazmaOrt','vocabOrt','konusmaOrt','grammarOrt'].some(key=>user?.[key]!==undefined && user?.[key]!==null && user?.[key]!=='')};
    if($('tab-profil')?.classList.contains('active')){emptyStates();styleCharts(true);}return result;
  };
})();

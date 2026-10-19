/* Read-only mission views; progress and league rewards come from the server. */
(()=>{'use strict';
let owner='',value=null;
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const goals={daily:[['route','1 bölüm tamamla',1,'path'],['game','1 oyun oyna',1,'game'],['review','3 kelime tekrar et',3,'book']],weekly:[['route','10 bölüm tamamla',10,'path'],['game','20 oyun oyna',20,'game'],['days','5 gün çalış',5,'goal']]};
window.dmRouteMissions={set(data,name){if(name!==who())return;owner=name;value=data||null;window.dmRefreshRouteCards?.();},markup(period){const data=owner===who()?value?.[period]:null;return '<section class="'+(period==='daily'?'rt-tasks':'rt-week')+' rt-card rt-missions" aria-label="'+(period==='daily'?'Günün 3 Görevi':'Haftanın 3 Görevi')+'"><div class="rt-task-list">'+goals[period].map(([event,label,target,icon])=>{const count=data?Math.min(target,Math.max(0,Number(data[event])||0)):null;return '<button type="button" data-rt="task" data-event="'+event+'" aria-label="'+label+' · '+(count===null?'yükleniyor':count+'/'+target)+'"><img src="route-assets/'+icon+'.svg" alt=""><span class="rt-mission-copy"><b>'+label+'</b><progress max="'+target+'" value="'+(count||0)+'" aria-label="'+label+' ilerlemesi"></progress></span><span class="rt-mission-count">'+(count===null?'…':count+'/'+target)+'</span><span aria-hidden="true">›</span></button>';}).join('')+'</div></section>';}};
document.addEventListener('dm:login',()=>{owner='';value=null;});
})();
